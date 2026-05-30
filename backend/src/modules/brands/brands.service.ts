import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AppError } from '../../common/errors/app-error';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(search?: string) {
    const where = search ? { name: { contains: search } } : undefined;
    return this.prisma.brand.findMany({
      where,
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!brand) throw AppError.notFound('Brand not found', 'BRAND_NOT_FOUND');
    return brand;
  }

  async create(dto: CreateBrandDto) {
    const existing = await this.prisma.brand.findUnique({ where: { name: dto.name } });
    if (existing) throw AppError.conflict('Brand name already exists', 'BRAND_EXISTS');

    return this.prisma.brand.create({ data: { name: dto.name, description: dto.description } });
  }

  async update(id: string, dto: UpdateBrandDto) {
    await this.findOne(id);

    if (dto.name) {
      const existing = await this.prisma.brand.findFirst({
        where: { name: dto.name, NOT: { id } },
      });
      if (existing) throw AppError.conflict('Brand name already exists', 'BRAND_EXISTS');
    }

    return this.prisma.brand.update({
      where: { id },
      data: { name: dto.name, description: dto.description, isActive: dto.isActive },
    });
  }

  async remove(id: string) {
    const brand = await this.findOne(id);
    const productCount = (brand as any)._count?.products ?? 0;
    if (productCount > 0) {
      throw AppError.conflict('Cannot delete brand with associated products', 'BRAND_HAS_PRODUCTS');
    }
    await this.prisma.brand.delete({ where: { id } });
    return { id };
  }
}
