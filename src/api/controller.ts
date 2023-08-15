import {Controller, Get, Param, Query} from '@nestjs/common'
import {getProposals} from '../proposals'
import {ProposalRecord} from '../types'
import {getHeight} from '../p2p'
import {Checksum256, Int64, UInt32} from '@wharfkit/antelope'
import {chain_id} from '../app'

interface ProposalsResponse {
    chain_id: Checksum256
    height: UInt32
    time: Int64
    proposals: ProposalRecord[]
}

@Controller('proposals')
export class ProposalsController {
    @Get(':account')
    async findOne(
        @Param() params: any,
        @Query('expired') expired: boolean
    ): Promise<ProposalsResponse> {
        const proposals = await getProposals(params.account, expired)
        const height = getHeight()
        return {
            chain_id: chain_id,
            height: height.headNum,
            time: height.time,
            proposals,
        }
    }

    // DISABLED: This endpoint would return all proposals for all accounts
    // @Get()
    // async findAll(@Param() params: any): Promise<ProposalsResponse> {
    //     const proposals = await getProposals()
    //     const height = getHeight()
    //     return {
    //         chain_id: chain_id,
    //         height: height.headNum,
    //         time: height.time,
    //         proposals,
    //     }
    // }
}
