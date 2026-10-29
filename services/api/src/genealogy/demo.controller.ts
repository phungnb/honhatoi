import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DEMO_LINEAGE_ID } from '../common/demo';
import { GenealogyService } from './genealogy.service';

/**
 * /demo — dòng họ mẫu, công khai, chỉ đọc. Không dùng JwtAuthGuard; mọi
 * truy vấn cố định vào DEMO_LINEAGE_ID nên không lộ được họ khác.
 */
@Controller('demo')
export class DemoController {
  constructor(
    private readonly genealogy: GenealogyService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async lineage() {
    const lineage = await this.prisma.lineage.findFirst({
      where: { id: DEMO_LINEAGE_ID, deletedAt: null },
      select: {
        id: true,
        name: true,
        branchName: true,
        hometownProvince: true,
        ancestralHallAddress: true,
      },
    });
    if (!lineage)
      throw new NotFoundException({
        code: 'DEMO_NOT_FOUND',
        message: 'Chưa có dòng họ mẫu',
      });
    return { data: { lineage }, error: null };
  }

  @Get('tree')
  tree(@Query('generations') generations?: string) {
    return this.genealogy.getTree(DEMO_LINEAGE_ID, '', {
      generations: generations ? Number(generations) || 6 : 6,
    });
  }

  @Get('anniversaries')
  anniversaries(@Query('limit') limit?: string, @Query('days') days?: string) {
    const n = Math.min(Math.max(parseInt(limit ?? '5', 10) || 5, 1), 20);
    const d = days === undefined ? undefined : parseInt(days, 10);
    return this.genealogy.anniversaries(
      DEMO_LINEAGE_ID,
      '',
      n,
      Number.isFinite(d) ? d : undefined,
    );
  }

  @Get('kinship')
  kinship(@Query('from') from?: string, @Query('to') to?: string) {
    if (!from || !to)
      throw new BadRequestException({
        code: 'MISSING_QUERY',
        message: 'Cần đủ tham số from và to',
      });
    return this.genealogy.kinship(DEMO_LINEAGE_ID, '', from, to);
  }
}
