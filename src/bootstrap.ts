import {Serializer, Transaction, PermissionLevel} from '@wharfkit/antelope'
import {contractKit, logger} from './common'
import {addProposal, resetProposals} from './proposals'

export async function bootstrap() {
    // Bootstrap by loading all proposals on chain
    try {
        // Reset proposal state
        resetProposals()
        // Load the contract
        const msig = await contractKit.load('eosio.msig')
        // Retrieve all scopes from the proposal table
        const scopes = await msig.table('proposal').scopes().all()
        logger.info(
            {scopes: scopes.length},
            'Bootstrapping proposal data based on number of scopes, this may take a while...'
        )
        // Iterate over each scope and load all approvals and proposals
        for (const scope of scopes) {
            const scopedProposals = await msig.table('proposal').query({scope: scope.scope}).all()
            const scopedApprovals = await msig.table('approvals2').query({scope: scope.scope}).all()
            for (const proposal of scopedProposals) {
                const approval = scopedApprovals.find((row) =>
                    row.proposal_name.equals(proposal.proposal_name)
                )
                // Decode each proposal and save it to state
                const transaction = Serializer.decode({
                    data: proposal.packed_transaction,
                    type: Transaction,
                })
                addProposal({
                    name: proposal.proposal_name,
                    scope: scope.scope,
                    status: 'proposed',
                    requested: approval.requested_approvals.map((row: any) =>
                        PermissionLevel.from(row.level)
                    ),
                    provided: approval.provided_approvals.map((row: any) =>
                        PermissionLevel.from(row.level)
                    ),
                    transaction,
                })
            }
        }
    } catch (e) {
        logger.error({e}, 'Bootstrap failed, retrying...')
        setTimeout(() => bootstrap(), 1000)
    }
}
