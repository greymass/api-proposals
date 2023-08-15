import {logger, client} from './common'

export async function getAuthorizations(
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
