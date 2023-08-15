import {Transaction, Serializer} from '@wharfkit/antelope'
import {logger} from './common'
import {
    hasProposal,
    executeProposal,
    addProposal,
    removeProposal,
    addApproval,
    removeApproval,
} from './proposals'
import {Exec, Propose, Cancel, Approve, Unapprove} from './types'

export function handleTransaction(transaction: Transaction) {
    for (const action of transaction.actions) {
        switch (String(action.account)) {
            case 'eosio.msig': {
                switch (String(action.name)) {
                    case 'exec': {
                        const data = Serializer.decode({
                            data: action.data,
                            type: Exec,
                        })
                        const scope = data.proposer
                        const name = data.proposal_name
                        logger.debug({name, scope, data}, 'processing eosio.msig::exec')
                        if (hasProposal(scope, name)) {
                            logger.info({scope, name}, 'executing proposal')
                            executeProposal(scope, name)
                        }
                    }
                    case 'propose': {
                        const data = Serializer.decode({
                            data: action.data,
                            type: Propose,
                        })
                        const scope = data.proposer
                        const name = data.proposal_name
                        logger.debug({name, scope, data}, 'processing eosio.msig::propose')
                        if (!hasProposal(scope, name)) {
                            logger.info({scope, name}, 'appending proposal')
                            addProposal({
                                scope,
                                name,
                                status: 'proposed',
                                requested: data.requested,
                                provided: [],
                                transaction: data.trx,
                            })
                        } else {
                            logger.debug({scope, name}, 'already has proposal loaded')
                        }
                        break
                    }
                    case 'cancel': {
                        const data = Serializer.decode({
                            data: action.data,
                            type: Cancel,
                        })
                        const scope = data.proposer
                        const name = data.proposal_name
                        logger.debug({name, scope, data}, 'processing eosio.msig::cancel')
                        if (hasProposal(scope, name)) {
                            logger.info({scope, name}, 'removing proposal')
                            removeProposal(scope, name)
                        }
                        break
                    }
                    case 'approve': {
                        const data = Serializer.decode({
                            data: action.data,
                            type: Approve,
                        })
                        const scope = data.proposer
                        const name = data.proposal_name
                        logger.debug({name, scope, data}, 'processing eosio.msig::approve')
                        if (hasProposal(scope, name)) {
                            logger.info({scope, name}, 'adding proposal approval')
                            addApproval(scope, name, data.level)
                        }
                        break
                    }
                    case 'unapprove': {
                        const data = Serializer.decode({
                            data: action.data,
                            type: Unapprove,
                        })
                        const scope = data.proposer
                        const name = data.proposal_name
                        logger.debug({name, scope, data}, 'processing eosio.msig::unapprove')
                        if (hasProposal(scope, name)) {
                            logger.info({scope, name}, 'removing proposal approval')
                            removeApproval(scope, name, data.level)
                        }
                        break
                    }
                }
                break
            }
            default: {
                // Ignore anything we don't recognize
                // logger.debug({action}, 'ignoring unknown action')
                break
            }
        }
    }
}
