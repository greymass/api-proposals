import {NameType, PermissionLevel} from '@wharfkit/antelope'
import {logger} from './common'
import {ProposalRecord} from './types'
import {getAuthorizations} from './authorizations'

const proposals: ProposalRecord[] = []

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
