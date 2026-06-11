import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { StorageModule } from '../storage/storage.module';
import { ClipsController } from './clips.controller';

@Module({
  imports: [PersistenceModule, StorageModule, AuthModule],
  controllers: [ClipsController],
})
export class ClipsModule {}
