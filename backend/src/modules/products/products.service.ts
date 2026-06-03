import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppError } from '../../common/errors/app-error';
import { createPaginatedResponse } from '../../common/utils/response';
import { PrismaService } from '../../database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { AddProductColorDto, CreateColorDto, UpdateColorDto } from './dto/manage-product-color.dto';
import { AddProductDesignDto, CreateDesignDto, UpdateDesignDto } from './dto/manage-product-design.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const PRODUCT_INCLUDE = {
  category: { select: { id: true, name: true } },
  brand: { select: { id: true, name: true } },
  color: { select: { id: true, name: true, colorCode: true } },
  design: { select: { id: true, name: true, designCode: true } },
  defaultUnit: { select: { id: true, name: true, abbreviation: true } },
  productColors: { include: { color: { select: { id: true, name: true, colorCode: true } } } },
  productDesigns: { include: { design: { select: { id: true, name: true, designCode: true } } } },
} as const;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(query: QueryProductDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { productCode: { contains: query.search } },
        { barcode: { contains: query.search } },
      ];
    }
    if (query.status) where.status = query.status;
    if (query.productType) where.productType = query.productType;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.brandId) where.brandId = query.brandId;

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: PRODUCT_INCLUDE,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: PRODUCT_INCLUDE,
    });
    if (!product) throw AppError.notFound('Product not found', 'PRODUCT_NOT_FOUND');
    return product;
  }

  async create(dto: CreateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { productCode: dto.productCode } });
    if (existing) throw AppError.conflict('Product code already exists', 'PRODUCT_CODE_EXISTS');

    if (dto.barcode) {
      const barcodeExists = await this.prisma.product.findUnique({ where: { barcode: dto.barcode } });
      if (barcodeExists) throw AppError.conflict('Barcode already exists', 'BARCODE_EXISTS');
    }

    await this.validateForeignKeys(dto);

    return this.prisma.product.create({
      data: {
        productCode: dto.productCode,
        name: dto.name,
        barcode: dto.barcode,
        description: dto.description,
        productType: dto.productType,
        categoryId: dto.categoryId,
        brandId: dto.brandId,
        colorId: dto.colorId,
        designId: dto.designId,
        defaultUnitId: dto.defaultUnitId,
        retailPrice: new Prisma.Decimal(dto.retailPrice),
        wholesalePrice: new Prisma.Decimal(dto.wholesalePrice),
      },
      include: PRODUCT_INCLUDE,
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);

    if (dto.productCode) {
      const existing = await this.prisma.product.findFirst({
        where: { productCode: dto.productCode, NOT: { id } },
      });
      if (existing) throw AppError.conflict('Product code already exists', 'PRODUCT_CODE_EXISTS');
    }

    if (dto.barcode) {
      const existing = await this.prisma.product.findFirst({
        where: { barcode: dto.barcode, NOT: { id } },
      });
      if (existing) throw AppError.conflict('Barcode already exists', 'BARCODE_EXISTS');
    }

    if (dto.categoryId || dto.brandId || dto.defaultUnitId || dto.colorId || dto.designId) {
      await this.validateForeignKeys(dto as CreateProductDto);
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        productCode: dto.productCode,
        name: dto.name,
        barcode: dto.barcode,
        description: dto.description,
        productType: dto.productType,
        categoryId: dto.categoryId,
        brandId: dto.brandId,
        colorId: dto.colorId ?? null,
        designId: dto.designId ?? null,
        defaultUnitId: dto.defaultUnitId,
        retailPrice: dto.retailPrice !== undefined ? new Prisma.Decimal(dto.retailPrice) : undefined,
        wholesalePrice: dto.wholesalePrice !== undefined ? new Prisma.Decimal(dto.wholesalePrice) : undefined,
        status: dto.status,
      },
      include: PRODUCT_INCLUDE,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    const rollCount = await this.prisma.roll.count({ where: { productId: id } });
    if (rollCount > 0) {
      throw AppError.conflict('Cannot delete product with associated rolls', 'PRODUCT_HAS_ROLLS');
    }
    await this.prisma.product.delete({ where: { id } });
    return { id };
  }

  // ── Product Colors ────────────────────────────────────────────────

  async getColors(productId: string) {
    await this.findOne(productId);
    return this.prisma.productColor.findMany({
      where: { productId },
      include: { color: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addColor(productId: string, dto: AddProductColorDto) {
    await this.findOne(productId);
    const color = await this.prisma.color.findUnique({ where: { id: dto.colorId } });
    if (!color) throw AppError.notFound('Color not found', 'COLOR_NOT_FOUND');

    const existing = await this.prisma.productColor.findUnique({
      where: { productId_colorId: { productId, colorId: dto.colorId } },
    });
    if (existing) throw AppError.conflict('Color already added to this product', 'PRODUCT_COLOR_EXISTS');

    return this.prisma.productColor.create({
      data: { productId, colorId: dto.colorId },
      include: { color: true },
    });
  }

  async removeColor(productId: string, colorId: string) {
    await this.findOne(productId);
    const record = await this.prisma.productColor.findUnique({
      where: { productId_colorId: { productId, colorId } },
    });
    if (!record) throw AppError.notFound('Product color not found', 'PRODUCT_COLOR_NOT_FOUND');
    await this.prisma.productColor.delete({ where: { id: record.id } });
    return { productId, colorId };
  }

  // ── Product Designs ───────────────────────────────────────────────

  async getDesigns(productId: string) {
    await this.findOne(productId);
    return this.prisma.productDesign.findMany({
      where: { productId },
      include: { design: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addDesign(productId: string, dto: AddProductDesignDto) {
    await this.findOne(productId);
    const design = await this.prisma.design.findUnique({ where: { id: dto.designId } });
    if (!design) throw AppError.notFound('Design not found', 'DESIGN_NOT_FOUND');

    const existing = await this.prisma.productDesign.findUnique({
      where: { productId_designId: { productId, designId: dto.designId } },
    });
    if (existing) throw AppError.conflict('Design already added to this product', 'PRODUCT_DESIGN_EXISTS');

    return this.prisma.productDesign.create({
      data: { productId, designId: dto.designId },
      include: { design: true },
    });
  }

  async removeDesign(productId: string, designId: string) {
    await this.findOne(productId);
    const record = await this.prisma.productDesign.findUnique({
      where: { productId_designId: { productId, designId } },
    });
    if (!record) throw AppError.notFound('Product design not found', 'PRODUCT_DESIGN_NOT_FOUND');
    await this.prisma.productDesign.delete({ where: { id: record.id } });
    return { productId, designId };
  }

  // ── Global Color/Design Catalog ───────────────────────────────────

  async findAllColors(search?: string, activeOnly?: boolean) {
    const where: Prisma.ColorWhereInput = {};
    if (search) where.name = { contains: search };
    if (activeOnly) where.isActive = true;
    return this.prisma.color.findMany({ where, orderBy: { name: 'asc' } });
  }

  async findColorById(id: string) {
    const color = await this.prisma.color.findUnique({ where: { id } });
    if (!color) throw AppError.notFound('Color not found', 'COLOR_NOT_FOUND');
    return color;
  }

  async createColor(dto: CreateColorDto) {
    const existing = await this.prisma.color.findUnique({ where: { name: dto.name } });
    if (existing) throw AppError.conflict('Color name already exists', 'COLOR_EXISTS');
    return this.prisma.color.create({
      data: { name: dto.name, colorCode: dto.colorCode, hexCode: dto.hexCode },
    });
  }

  async updateColor(id: string, dto: UpdateColorDto) {
    await this.findColorById(id);
    if (dto.name) {
      const existing = await this.prisma.color.findFirst({ where: { name: dto.name, NOT: { id } } });
      if (existing) throw AppError.conflict('Color name already exists', 'COLOR_EXISTS');
    }
    return this.prisma.color.update({
      where: { id },
      data: { name: dto.name, colorCode: dto.colorCode, hexCode: dto.hexCode, isActive: dto.isActive },
    });
  }

  async deleteColor(id: string) {
    await this.findColorById(id);
    const rollCount = await this.prisma.roll.count({ where: { colorId: id } });
    if (rollCount > 0) throw AppError.conflict('Cannot delete color with associated rolls', 'COLOR_HAS_ROLLS');
    await this.prisma.color.delete({ where: { id } });
    return { id };
  }

  async findAllDesigns(search?: string, activeOnly?: boolean) {
    const where: Prisma.DesignWhereInput = {};
    if (search) where.name = { contains: search };
    if (activeOnly) where.isActive = true;
    return this.prisma.design.findMany({ where, orderBy: { name: 'asc' } });
  }

  async findDesignById(id: string) {
    const design = await this.prisma.design.findUnique({ where: { id } });
    if (!design) throw AppError.notFound('Design not found', 'DESIGN_NOT_FOUND');
    return design;
  }

  async createDesign(dto: CreateDesignDto) {
    const existing = await this.prisma.design.findUnique({ where: { name: dto.name } });
    if (existing) throw AppError.conflict('Design name already exists', 'DESIGN_EXISTS');
    return this.prisma.design.create({
      data: { name: dto.name, designCode: dto.designCode, description: dto.description },
    });
  }

  async updateDesign(id: string, dto: UpdateDesignDto) {
    await this.findDesignById(id);
    if (dto.name) {
      const existing = await this.prisma.design.findFirst({ where: { name: dto.name, NOT: { id } } });
      if (existing) throw AppError.conflict('Design name already exists', 'DESIGN_EXISTS');
    }
    return this.prisma.design.update({
      where: { id },
      data: { name: dto.name, designCode: dto.designCode, description: dto.description, isActive: dto.isActive },
    });
  }

  async deleteDesign(id: string) {
    await this.findDesignById(id);
    const rollCount = await this.prisma.roll.count({ where: { designId: id } });
    if (rollCount > 0) throw AppError.conflict('Cannot delete design with associated rolls', 'DESIGN_HAS_ROLLS');
    await this.prisma.design.delete({ where: { id } });
    return { id };
  }

  // ── POS Search ────────────────────────────────────────────────────

  async posSearch(search: string, limit = 10) {
    if (!search || search.trim().length === 0) return [];

    const products = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { name: { contains: search } },
          { productCode: { contains: search } },
          { barcode: { contains: search } },
        ],
      },
      select: {
        id: true,
        productCode: true,
        name: true,
        barcode: true,
        productType: true,
        retailPrice: true,
        wholesalePrice: true,
        color: { select: { id: true, name: true } },
        design: { select: { id: true, name: true } },
        defaultUnit: { select: { id: true, name: true, abbreviation: true } },
        rolls: {
          where: { status: { in: ['IN_STOCK', 'ALLOCATED'] } },
          select: {
            id: true,
            rollNumber: true,
            barcode: true,
            status: true,
            remainingLengthYard: true,
            salePricePerYard: true,
            location: true,
            color: { select: { id: true, name: true } },
            design: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'asc' as const },
        },
        productStockItems: {
          where: { isActive: true },
          select: {
            id: true,
            quantityOnHand: true,
            barcodeValue: true,
            salePricePerUnit: true,
            location: true,
            color: { select: { id: true, name: true } },
            design: { select: { id: true, name: true } },
            unit: { select: { id: true, name: true, abbreviation: true } },
          },
          orderBy: { createdAt: 'asc' as const },
        },
      },
      take: limit,
      orderBy: { name: 'asc' },
    });

    return products.map((p) => ({
      id: p.id,
      productCode: p.productCode,
      name: p.name,
      barcode: p.barcode,
      productType: p.productType,
      retailPrice: p.retailPrice,
      wholesalePrice: p.wholesalePrice,
      color: p.color,
      design: p.design,
      defaultUnit: p.defaultUnit,
      availableRolls: p.productType === 'FABRIC_ROLL' ? p.rolls : [],
      stockItems: p.productType !== 'FABRIC_ROLL' ? p.productStockItems : [],
    }));
  }

  // ── Stock Items ────────────────────────────────────────────────────

  async getStockItems(productId: string) {
    await this.findOne(productId);
    return this.prisma.productStockItem.findMany({
      where: { productId },
      include: {
        color: { select: { id: true, name: true } },
        design: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true, abbreviation: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────

  private async validateForeignKeys(dto: Partial<CreateProductDto>) {
    if (dto.categoryId) {
      const cat = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
      if (!cat) throw AppError.badRequest('Category not found', 'CATEGORY_NOT_FOUND');
    }
    if (dto.brandId) {
      const brand = await this.prisma.brand.findUnique({ where: { id: dto.brandId } });
      if (!brand) throw AppError.badRequest('Brand not found', 'BRAND_NOT_FOUND');
    }
    if (dto.defaultUnitId) {
      const unit = await this.prisma.unit.findUnique({ where: { id: dto.defaultUnitId } });
      if (!unit) throw AppError.badRequest('Unit not found', 'UNIT_NOT_FOUND');
    }
    if (dto.colorId) {
      const color = await this.prisma.color.findUnique({ where: { id: dto.colorId } });
      if (!color) throw AppError.badRequest('Color not found', 'COLOR_NOT_FOUND');
    }
    if (dto.designId) {
      const design = await this.prisma.design.findUnique({ where: { id: dto.designId } });
      if (!design) throw AppError.badRequest('Design not found', 'DESIGN_NOT_FOUND');
    }
  }
}
