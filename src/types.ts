import {
    Bytes,
    Checksum256,
    Name,
    Struct,
    TimePoint,
    TimePointSec,
    UInt16,
    UInt32,
    UInt8,
    VarUInt,
} from '@wharfkit/antelope'

@Struct.type('permission_level')
export class PermissionLevel extends Struct {
    @Struct.field(Name) actor!: Name
    @Struct.field(Name) permission!: Name
}

@Struct.type('action')
export class Action extends Struct {
    @Struct.field(Name) account!: Name
    @Struct.field(Name) name!: Name
    @Struct.field(PermissionLevel, {array: true}) authorization!: PermissionLevel[]
    @Struct.field(Bytes) data!: Bytes
}

@Struct.type('approval')
export class Approval extends Struct {
    @Struct.field(PermissionLevel) level!: PermissionLevel
    @Struct.field(TimePoint) time!: TimePoint
}

@Struct.type('approvals_info')
export class ApprovalsInfo extends Struct {
    @Struct.field(UInt8) version!: UInt8
    @Struct.field(Name) proposal_name!: Name
    @Struct.field(Approval, {array: true}) requested_approvals!: Approval[]
    @Struct.field(Approval, {array: true}) provided_approvals!: Approval[]
}

@Struct.type('approve')
export class Approve extends Struct {
    @Struct.field(Name) proposer!: Name
    @Struct.field(Name) proposal_name!: Name
    @Struct.field(PermissionLevel) level!: PermissionLevel
    @Struct.field(Checksum256, {extension: true}) proposal_hash!: Checksum256
}

@Struct.type('cancel')
export class Cancel extends Struct {
    @Struct.field(Name) proposer!: Name
    @Struct.field(Name) proposal_name!: Name
    @Struct.field(Name) canceler!: Name
}

@Struct.type('exec')
export class Exec extends Struct {
    @Struct.field(Name) proposer!: Name
    @Struct.field(Name) proposal_name!: Name
    @Struct.field(Name) executer!: Name
}

@Struct.type('extension')
export class Extension extends Struct {
    @Struct.field(UInt16) type!: UInt16
    @Struct.field(Bytes) data!: Bytes
}

@Struct.type('invalidate')
export class Invalidate extends Struct {
    @Struct.field(Name) account!: Name
}

@Struct.type('invalidation')
export class Invalidation extends Struct {
    @Struct.field(Name) account!: Name
    @Struct.field(TimePoint) last_invalidation_time!: TimePoint
}

@Struct.type('old_approvals_info')
export class OldApprovalsInfo extends Struct {
    @Struct.field(Name) proposal_name!: Name
    @Struct.field(PermissionLevel, {array: true}) requested_approvals!: PermissionLevel[]
    @Struct.field(PermissionLevel, {array: true}) provided_approvals!: PermissionLevel[]
}

@Struct.type('proposal')
export class Proposal extends Struct {
    @Struct.field(Name) proposal_name!: Name
    @Struct.field(Bytes) packed_transaction!: Bytes
    @Struct.field(TimePoint, {optional: true, extension: true}) earliest_exec_time?: TimePoint
}

@Struct.type('transaction_header')
export class TransactionHeader extends Struct {
    @Struct.field(TimePointSec) expiration!: TimePointSec
    @Struct.field(UInt16) ref_block_num!: UInt16
    @Struct.field(UInt32) ref_block_prefix!: UInt32
    @Struct.field(VarUInt) max_net_usage_words!: VarUInt
    @Struct.field(UInt8) max_cpu_usage_ms!: UInt8
    @Struct.field(VarUInt) delay_sec!: VarUInt
}

@Struct.type('transaction')
export class Transaction extends TransactionHeader {
    @Struct.field(Action, {array: true}) context_free_actions!: Action[]
    @Struct.field(Action, {array: true}) actions!: Action[]
    @Struct.field(Extension, {array: true}) transaction_extensions!: Extension[]
}

@Struct.type('propose')
export class Propose extends Struct {
    @Struct.field(Name) proposer!: Name
    @Struct.field(Name) proposal_name!: Name
    @Struct.field(PermissionLevel, {array: true}) requested!: PermissionLevel[]
    @Struct.field(Transaction) trx!: Transaction
}

@Struct.type('unapprove')
export class Unapprove extends Struct {
    @Struct.field(Name) proposer!: Name
    @Struct.field(Name) proposal_name!: Name
    @Struct.field(PermissionLevel) level!: PermissionLevel
}

export interface ProposalRecord {
    name: Name
    scope: Name
    status: 'executed' | 'expired' | 'canceled' | 'proposed'
    requested: PermissionLevel[]
    provided: PermissionLevel[]
    transaction: Transaction
}
