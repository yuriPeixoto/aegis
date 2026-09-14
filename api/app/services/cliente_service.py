from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.cliente import Cliente
from app.models.cliente_modulo import ClienteModulo
from app.models.modulo import Modulo
from app.schemas.cliente import ClienteCreate, ClienteUpdate


class ClienteService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(self, data: ClienteCreate) -> Cliente:
        cliente = Cliente(nome=data.nome, source_id=data.source_id)
        self._db.add(cliente)
        await self._db.commit()
        await self._db.refresh(cliente)
        return await self.get_by_id(cliente.id)  # type: ignore[return-value]

    async def get_by_id(self, cliente_id: int) -> Cliente | None:
        result = await self._db.execute(
            select(Cliente).where(Cliente.id == cliente_id).options(selectinload(Cliente.source))
        )
        return result.scalar_one_or_none()

    async def list_all(self) -> list[Cliente]:
        result = await self._db.execute(
            select(Cliente).options(selectinload(Cliente.source)).order_by(Cliente.nome)
        )
        return list(result.scalars().all())

    async def update(self, cliente_id: int, data: ClienteUpdate) -> Cliente | None:
        cliente = await self.get_by_id(cliente_id)
        if cliente is None:
            return None
        if data.nome is not None:
            cliente.nome = data.nome
        if data.ativo is not None:
            cliente.ativo = data.ativo
        # source_id é sempre reenviado pelo formulário de edição (inclusive como
        # null pra "Nenhuma") — não é um patch parcial, então sobrescreve direto.
        cliente.source_id = data.source_id
        await self._db.commit()
        await self._db.refresh(cliente)
        return await self.get_by_id(cliente_id)

    async def modulos_ativos_por_cliente(
        self, cliente_ids: list[int]
    ) -> dict[int, list[tuple[ClienteModulo, Modulo]]]:
        if not cliente_ids:
            return {}
        result = await self._db.execute(
            select(ClienteModulo, Modulo)
            .join(Modulo, ClienteModulo.modulo_id == Modulo.id)
            .where(ClienteModulo.cliente_id.in_(cliente_ids), ClienteModulo.ativo.is_(True))
        )
        out: dict[int, list[tuple[ClienteModulo, Modulo]]] = {}
        for cm, modulo in result.all():
            out.setdefault(cm.cliente_id, []).append((cm, modulo))
        return out

    async def set_modulos(self, cliente_id: int, modulo_ids: list[int]) -> None:
        """Substitui o conjunto de módulos ativos do cliente pelos IDs enviados —
        reativa vínculo existente, cria o que falta, desativa o que sobrou. Nunca
        apaga a linha (histórico de ativação), só marca ativo=False."""
        result = await self._db.execute(
            select(ClienteModulo).where(ClienteModulo.cliente_id == cliente_id)
        )
        existentes = {cm.modulo_id: cm for cm in result.scalars().all()}

        for modulo_id in modulo_ids:
            if modulo_id in existentes:
                existentes[modulo_id].ativo = True
            else:
                self._db.add(ClienteModulo(cliente_id=cliente_id, modulo_id=modulo_id, ativo=True))

        for modulo_id, cm in existentes.items():
            if modulo_id not in modulo_ids:
                cm.ativo = False

        await self._db.commit()
