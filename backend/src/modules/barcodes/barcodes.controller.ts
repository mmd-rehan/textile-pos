import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { BarcodesService } from './barcodes.service';

@Controller('barcodes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BarcodesController {
  constructor(private readonly barcodesService: BarcodesService) { }

  @Get(':barcode/lookup')
  @RequirePermissions('read:inventory')
  async lookup(@Param('barcode') barcode: string) {
    const data = await this.barcodesService.lookup(barcode);
    return { data };
  }
}
