import {Module} from '@nestjs/common'
import {ProposalsController} from './controller'

@Module({
    controllers: [ProposalsController],
})
export class ProposalsModule {}
