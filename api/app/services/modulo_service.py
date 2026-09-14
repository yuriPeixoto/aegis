from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cliente_modulo import ClienteModulo
from app.models.modulo import Modulo
from app.schemas.modulo import ModuloCreate, ModuloUpdate


class ModuloService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(self, data: ModuloCreate) -> Modulo:
        modulo = Modulo(nome=data.nome)
        self._db.add(modulo)
        await self._db.commit()
        await self._db.refresh(modulo)
        return modulo

    async def get_by_id(self, modulo_id: int) -> Modulo | None:
        result = await self._db.execute(select(Modulo).where(Modulo.id == modulo_id))
        return result.scalar_one_or_none()

    async def list_all(self) -> list[tuple[Modulo, int]]:
        result = await self._db.execute(
            select(Modulo, func.count(ClienteModulo.id))
            .outerjoin(
                ClienteModulo,
                (ClienteModulo.modulo_id == Modulo.id) & (ClienteModulo.ativo.is_(True)),
            )
            .group_by(Modulo.id)
            .order_by(Modulo.nome)
        )
        return [(modulo, count) for modulo, count in result.all()]

    async def update(self, modulo_id: int, data: ModuloUpdate) -> Modulo | None:
        modulo = await self.get_by_id(modulo_id)
        if modulo is None:
            return None
        if data.nome is not None:
            modulo.nome = data.nome
        if data.ativo is not None:
            modulo.ativo = data.ativo
        await self._db.commit()
        await self._db.refresh(modulo)
        return modulo
