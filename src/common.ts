import {APIClient, BlockId, Int64, UInt32} from '@wharfkit/antelope'
import {ContractKit} from '@wharfkit/contract'
import * as bunyan from 'bunyan'
import config from 'config'

export const client = new APIClient({url: config.get('api')})
export const contractKit = new ContractKit({client})

export const reconnect = 3000

export interface P2PConnection {
    host: string
    port: number
}

export const connection: P2PConnection = {
    host: config.get('p2phost'),
    port: config.get('p2pport'),
}

export interface Height {
    headId: BlockId
    libId: BlockId
    headNum: UInt32
    libNum: UInt32
    time: Int64
}

export const logger = bunyan.createLogger({
    name: config.get('name'),
    streams: (config.get('log') as any[]).map(({level, out}) => {
        if (out === 'stdout') {
            return {level, stream: process.stdout}
        } else if (out === 'stderr') {
            return {level, stream: process.stderr}
        } else {
            return {level, path: out}
        }
    }),
})

export const version = require('../package.json').version + '-dev'
