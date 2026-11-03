import { Controller, Get, NotFoundException, Query, Req, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { StorageService } from './storage.service';

/**
 * GET /files/<key>?e=&s= — đọc tệp qua URL ký (do API cấp kèm tin nhắn cho
 * người có quyền xem). Không cần JWT vì thẻ <img> không gửi header.
 */
@Controller('files')
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  @SkipThrottle()
  @Get('*path')
  async read(
    @Req() req: Request,
    @Res() res: Response,
    @Query('e') e?: string,
    @Query('s') s?: string,
  ) {
    const raw = req.path.replace(/^.*?\/files\//, '');
    const key = raw.split('/').map(decodeURIComponent).join('/');
    if (!key || key.includes('..') || !this.storage.verify(key, e, s))
      throw new NotFoundException({ code: 'FILE_NOT_FOUND', message: 'Không tìm thấy tệp' });
    const f = await this.storage.get(key);
    if (!f) throw new NotFoundException({ code: 'FILE_NOT_FOUND', message: 'Không tìm thấy tệp' });
    res.setHeader('Content-Type', f.contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=86400, immutable');
    res.setHeader('Content-Disposition', 'inline');
    res.send(f.body);
  }
}
