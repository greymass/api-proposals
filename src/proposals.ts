import {NameType, PermissionLevel, Serializer, Transaction} from '@wharfkit/antelope'
import {logger, client, contractKit} from './common'
import {ProposalRecord} from './types'

const proposals: ProposalRecord[] = []

async function getAuthorizations(
    accounts: string[],
    knownAccounts: string[] = []
): Promise<string[]> {
    // Maintain a collection of known accounts for recursion
    if (knownAccounts.length === 0) {
        knownAccounts = [...accounts]
    }

    // Retrieve the authorizations this account has through account permissions
    logger.debug({accounts}, 'checking authorizations')
    const result = await client.v1.chain.get_accounts_by_authorizers({accounts})

    // Determine which accounts are new and unknown
    const returnedAccounts: string[] = result.accounts.map((row) => String(row.account_name))
    const uniqueAccounts: string[] = [...new Set(returnedAccounts)]
    const unknownAccounts: string[] = uniqueAccounts.filter(
        (account) => !knownAccounts.includes(account)
    )

    // Merge new accounts
    accounts.push(...uniqueAccounts)

    // Ensure uniqueness
    accounts = [...new Set(accounts)]

    // Recursively fetch information about new accounts
    if (unknownAccounts.length > 0) {
        accounts.push(...(await getAuthorizations(unknownAccounts, accounts)))
    }

    return accounts
}

export function addProposal(proposal: ProposalRecord) {
    logger.debug({proposal}, 'Adding proposal')
    proposals.push(proposal)
}

export function removeProposal(scope: NameType, name: NameType) {
    const proposal = proposals.find((p) => p.name.equals(name) && p.scope.equals(scope))
    if (proposal) {
        const index = proposals.indexOf(proposal)
        logger.debug({scope, name, index}, 'Removing proposal at index')
        proposals.splice(index, 1)
    }
}

export function getProposal(scope: NameType, name: NameType): ProposalRecord | undefined {
    return proposals.find((p) => p.name.equals(name) && p.scope.equals(scope))
}

export function addApproval(scope: NameType, name: NameType, approval: PermissionLevel) {
    const proposal = getProposal(scope, name)
    if (proposal) {
        logger.debug({scope, name, approval}, 'Adding approval')
        proposal.provided.push(approval)
    }
}

export function executeProposal(scope: NameType, name: NameType) {
    const proposal = getProposal(scope, name)
    if (proposal) {
        logger.debug({scope, name}, 'Marking proposal as executed')
        proposal.status = 'executed'
    }
}

export function removeApproval(scope: NameType, name: NameType, approval: PermissionLevel) {
    const proposal = getProposal(scope, name)
    if (proposal) {
        const index = proposal.provided.indexOf(approval)
        logger.debug({scope, name, approval, index}, 'Removing approval at index')
        proposal.provided.splice(index, 1)
    }
}

export function hasProposal(scope: NameType, name: NameType) {
    const check = proposals.some((p) => p.name.equals(name) && p.scope.equals(scope))
    logger.debug({scope, name, check}, 'Checking for proposal')
    return check
}

export function resetProposals() {
    logger.debug('Resetting proposals')
    proposals.splice(0, proposals.length)
}

export async function getProposals(
    account?: string,
    expired: boolean = false
): Promise<ProposalRecord[]> {
    if (!account) {
        return proposals
    }

    logger.debug({account}, 'retreiving valid authorizations')
    const accounts = await getAuthorizations([account])
    logger.debug({accounts}, 'valid authorizations')

    return (
        proposals
            // Filter by expired first
            .filter((proposal) => {
                // If expired=true, allow expired transactions
                if (expired) {
                    return true
                }
                // If transaction is expired, skip
                return proposal.transaction.expiration.toDate() > new Date()
            })
            // Then filter down to where one authorization matches the transaction
            .filter((proposal) => {
                return proposal.requested.some((authorization) => {
                    return accounts.includes(String(authorization.actor))
                })
            })
    )
}

export async function bootstrap() {
    // Bootstrap by loading all proposals on chain
    // try {
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
            proposals.push({
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
    logger.info({proposals: proposals.length}, 'Found and loaded proposals for initial data set!')
    // } catch (e) {
    //     logger.error({e}, 'Bootstrap failed, retrying...')
    //     setTimeout(() => bootstrap(), 1000)
    // }
}
