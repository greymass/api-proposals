import {
    API,
    Checksum256,
    P2P,
    P2PClient,
    PackedTransaction,
    PrivateKey,
    SimpleEnvelopeP2PProvider,
} from '@wharfkit/antelope'
import {Socket} from 'net'

import {Height, client, connection, logger, reconnect} from './common'
import {handleTransaction} from './msig'

let current: Height
export function getHeight(): Height {
    return current
}

export async function p2p(info: API.v1.GetInfoResponse, restart: boolean = false) {
    if (!restart) {
        current = {
            headId: info.head_block_id,
            headNum: info.head_block_num,
            libId: info.last_irreversible_block_id,
            libNum: info.last_irreversible_block_num,
            time: info.head_block_time.value,
        }
    }

    logger.info({current, connection}, 'Starting P2P client')

    const socket = new Socket()
    socket.on('error', function (ex) {
        logger.error('p2p connection lost, reconnecting')
        setTimeout(() => p2p(info, true), reconnect)
    })

    socket.connect(connection.port, connection.host, async () => {
        const p2pclient = new P2PClient({
            provider: new SimpleEnvelopeP2PProvider(socket),
        })

        // Generate a key pair for usage in our messages
        const privateKey = PrivateKey.generate('K1')
        const publicKey = privateKey.toPublic()
        const token = Checksum256.hash(current.time.byteArray)

        // Assemble the P2P.HandshakeMessage
        const handshake: P2P.HandshakeMessage = P2P.HandshakeMessage.from({
            networkVersion: 0xfe,
            chainId: info.chain_id,
            nodeId: Checksum256.hash(publicKey.data),
            key: publicKey,
            token,
            sig: privateKey.signDigest(token),
            p2pAddress: 'none',
            time: current.time,
            lastIrreversibleBlockNumber: current.libNum,
            lastIrreversibleBlockId: current.libId,
            headNum: current.headNum,
            headId: current.headId,
            os: 'nodejs',
            agent: 'wharfkit/antelope',
            generation: 4,
        })

        // Send the connected client the message
        p2pclient.send(handshake)

        // Sync data from when we started or last connected
        const currentInfo = await client.v1.chain.get_info()
        const catchup = P2P.SyncRequestMessage.from({
            startBlock: current.headNum,
            endBlock: currentInfo.head_block_num,
        })
        logger.info({catchup}, 'Syncing from initialization point')
        p2pclient.send(catchup)

        p2pclient.on('close', () => {
            logger.error('p2p connection lost, reconnecting')
            p2pclient.destroy()
            setTimeout(() => p2p(info, true), reconnect)
        })

        p2pclient.on('message', (msg) => {
            // Each message received has a type and data
            const {value} = msg
            // Switch based on message type
            switch (value.constructor) {
                // If we receive a time_message...
                case P2P.TimeMessage: {
                    // Assemble a response using the current time
                    const payload = P2P.TimeMessage.from({
                        org: Date.now(),
                        rec: 0,
                        xmt: 0,
                        dst: 0,
                    })
                    // Respond to the peer to let them know this connection is alive
                    p2pclient.send(payload)
                    break
                }
                case P2P.SignedBlock: {
                    // Iterate over each new transaction in the block
                    const block = value as P2P.SignedBlock
                    const header = P2P.BlockHeader.from(block)
                    logger.debug(
                        {height: Number(header.blockNum), txs: block.transactions.length},
                        'Block received'
                    )
                    // Record this as the current block height
                    current = {
                        headId: header.id,
                        headNum: header.blockNum,
                        libId: header.id,
                        libNum: header.blockNum,
                        time: current.time.adding(500000),
                    }
                    // Iterate over each action in the transaction
                    for (const receipt of block.transactions) {
                        switch (receipt.trx.variantIdx) {
                            case 1: {
                                if (receipt.trx.value instanceof PackedTransaction) {
                                    handleTransaction(receipt.trx.value.getTransaction())
                                }
                                break
                            }
                            default: {
                                logger.debug(
                                    {trx: JSON.stringify(receipt.trx, null, 2)},
                                    'Unknown variant structure'
                                )
                                // throw new Error('Unknown transaction variant')
                            }
                        }
                    }
                    break
                }
                default: {
                    break
                }
            }
        })
    })
}
