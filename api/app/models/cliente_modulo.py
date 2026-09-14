from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.cliente import Cliente
    from app.models.modulo import Modulo

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ClienteModulo(Base):
    """Vínculo Cliente↔Módulo, com flag de ativação — ver ADR-012.
    Sem versão/responsável no MVP (YAGNI, ninguém pediu histórico ainda)."""

    __tablename__ = "cliente_modulos"
    __table_args__ = (UniqueConstraint("cliente_id", "modulo_id", name="uq_cliente_modulo"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    cliente_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("clientes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    modulo_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("modulos.id", ondelete="CASCADE"), nullable=False, index=True
    )
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    ativado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    cliente: Mapped[Cliente] = relationship("Cliente")
    modulo: Mapped[Modulo] = relationship("Modulo")
