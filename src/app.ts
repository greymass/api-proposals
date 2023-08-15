import {NestFactory} from '@nestjs/core'
import {Checksum256} from '@wharfkit/antelope'
import config from 'config'

import {ProposalsModule} from './api/modules'
import {client, logger, version} from './common'
import {p2p} from './p2p'
import {bootstrap} from './proposals'

export let chain_id: Checksum256

export async function main() {
    // Determine start point
    const info = await client.v1.chain.get_info()
    chain_id = info.chain_id
    logger.info({config, version, height: Number(info.head_block_num)}, 'Starting API services')

    // Bootstrap initial data
    await bootstrap()

    // Initializing P2P client to subscribe to new blocks
    p2p(info)

    // Start API services
    logger.info('Starting API services')
    const app = await NestFactory.create(ProposalsModule)
    await app.listen(config.get('port'))
}

function ensureExit(code: number, timeout = 3000) {
    process.exitCode = code
    setTimeout(() => {
        process.exit(code)
    }, timeout)
}

if (module === require.main) {
    process.once('uncaughtException', (error) => {
        logger.error(error, 'Uncaught exception')
        ensureExit(1)
    })
    main().catch((error) => {
        logger.fatal(error, 'Unable to start application')
        ensureExit(1)
    })
}
