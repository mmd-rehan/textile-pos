import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AppError } from '../../common/errors/app-error';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.unit.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const unit = await this.prisma.unit.findUnique({ where: { id } });
    if (!unit) throw AppError.notFound('Unit not found', 'UNIT_NOT_FOUND');
    return unit;
  }

  async create(dto: CreateUnitDto) {
    const existingAbbr = await this.prisma.unit.findUnique({ where: { abbreviation: dto.abbreviation } });
    if (existingAbbr) throw AppError.conflict('Unit abbreviation already exists', 'UNIT_ABBREVIATION_EXISTS');

    const existingName = await this.prisma.unit.findUnique({ where: { name: dto.name } });
    if (existingName) throw AppError.conflict('Unit name already exists', 'UNIT_NAME_EXISTS');

    return this.prisma.unit.create({ data: { name: dto.name, abbreviation: dto.abbreviation } });
  }

  async update(id: string, dto: UpdateUnitDto) {
    await this.findOne(id);

    if (dto.abbreviation) {
      const existing = await this.prisma.unit.findFirst({
        where: { abbreviation: dto.abbreviation, NOT: { id } },
      });
      if (existing) throw AppError.conflict('Unit abbreviation already exists', 'UNIT_ABBREVIATION_EXISTS');
    }

    return this.prisma.unit.update({ where: { id }, data: { name: dto.name, abbreviation: dto.abbreviation } });
  }

  async remove(id: string) {
    await this.findOne(id);
    const productCount = await this.prisma.product.count({ where: { defaultUnitId: id } });
    if (productCount > 0) {
      throw AppError.conflict('Cannot delete unit used by products', 'UNIT_IN_USE');
    }
    await this.prisma.unit.delete({ where: { id } });
    return { id };
  }

  async findConversions() {
    return this.prisma.unitConversion.findMany({
      include: {
        fromUnit: { select: { id: true, name: true, abbreviation: true } },
        toUnit: { select: { id: true, name: true, abbreviation: true } },
      },
      orderBy: [{ fromUnitId: 'asc' }, { toUnitId: 'asc' }],
    });
  }
}
