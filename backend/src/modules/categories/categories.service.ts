import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AppError } from '../../common/errors/app-error';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(search?: string) {
    const where = search
      ? { name: { contains: search } }
      : undefined;

    return this.prisma.category.findMany({
      where,
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { products: true, subcategories: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true } },
        subcategories: { select: { id: true, name: true, isActive: true } },
        _count: { select: { products: true } },
      },
    });
    if (!category) throw AppError.notFound('Category not found', 'CATEGORY_NOT_FOUND');
    return category;
  }

  async create(dto: CreateCategoryDto) {
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw AppError.badRequest('Parent category not found', 'PARENT_NOT_FOUND');
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        description: dto.description,
        parentId: dto.parentId,
      },
      include: { parent: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);

    if (dto.parentId) {
      if (dto.parentId === id) throw AppError.badRequest('Category cannot be its own parent', 'CIRCULAR_PARENT');
      const parent = await this.prisma.category.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw AppError.badRequest('Parent category not found', 'PARENT_NOT_FOUND');
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        parentId: dto.parentId,
        isActive: dto.isActive,
      },
      include: { parent: { select: { id: true, name: true } } },
    });
  }

  async remove(id: string) {
    const category = await this.findOne(id);
    const productCount = (category as any)._count?.products ?? 0;
    if (productCount > 0) {
      throw AppError.conflict(
        'Cannot delete category with associated products',
        'CATEGORY_HAS_PRODUCTS',
      );
    }
    await this.prisma.category.delete({ where: { id } });
    return { id };
  }
}
