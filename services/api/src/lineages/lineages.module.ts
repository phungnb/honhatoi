import { Module } from '@nestjs/common';
import { LineagesController } from './lineages.controller';
import { LineagesService } from './lineages.service';

@Module({
  controllers: [LineagesController],
  providers: [LineagesService],
  exports: [LineagesService],
})
export class LineagesModule {}
