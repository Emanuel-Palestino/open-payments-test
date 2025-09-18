'use server'

import { createAuthenticatedClient, isFinalizedGrant, PendingGrant } from "@interledger/open-payments"

export type ActionState = {
  error: string | null,
  redirectTo?: string,
}

const CLIENT_WALLET_ADDRESS_URL = 'https://ilp.interledger-test.dev/op-test-mx-client'
const KEY_ID = '7ba18321-0415-404b-90f9-a60eb1bfbd30'

const SENDING_WALLET_ADDRESS_URL = 'https://ilp.interledger-test.dev/op-test-mx'
const RECEIVING_WALLET_ADDRESS_URL = 'https://ilp.interledger-test.dev/op-test-mx'

export async function sendMoneyFirstStep(initialState: ActionState, formData: FormData): Promise<ActionState> {

  const opClient = await createAuthenticatedClient({
    walletAddressUrl: CLIENT_WALLET_ADDRESS_URL,
    keyId: KEY_ID,
    privateKey: process.env.PRIVATE_KEY as string
  })

  const sendingWalletAddress = await opClient.walletAddress.get({
    url: SENDING_WALLET_ADDRESS_URL,
  })

  const receivingWalletAddress = await opClient.walletAddress.get({
    url: RECEIVING_WALLET_ADDRESS_URL,
  })

  const incomingPaymentGrant = await opClient.grant.request(
    {
      url: receivingWalletAddress.authServer,
    },
    {
      access_token: {
        access: [{
          type: 'incoming-payment',
          actions: ['read', 'complete', 'create'],
        }]
      }
    }
  )

  if (!isFinalizedGrant(incomingPaymentGrant)) {
    return {
      error: 'Failed to get incoming payment grant'
    }
  }

  //const amount = formData.get('amount') as string

  const incomingPayment = await opClient.incomingPayment.create(
    {
      url: receivingWalletAddress.resourceServer,
      accessToken: incomingPaymentGrant.access_token.value,
    },
    {
      walletAddress: receivingWalletAddress.id,
      incomingAmount: {
        assetCode: receivingWalletAddress.assetCode,
        assetScale: receivingWalletAddress.assetScale,
        value: '1000',
      },
    },
  )

  const quoteGrant = await opClient.grant.request(
    {
      url: sendingWalletAddress.authServer
    },
    {
      access_token: {
        access: [
          {
            type: 'quote',
            actions: ['create', 'read']
          }
        ]
      }
    }
  )

  if (!isFinalizedGrant(quoteGrant)) {
    return {
      error: 'Failed to get quote grant'
    }
  }

  const quote = await opClient.quote.create(
    {
      url: sendingWalletAddress.resourceServer,
      accessToken: quoteGrant.access_token.value
    },
    {
      walletAddress: sendingWalletAddress.id,
      receiver: incomingPayment.id,
      method: 'ilp'
    }
  )

  console.log('\nStep 5: got quote on sending wallet address', quote)

  return {
    error: null
  }

}

export async function sendMoneySecondStep(initialState: ActionState, formData: FormData): Promise<ActionState> {
  const opClient = await createAuthenticatedClient({
    walletAddressUrl: CLIENT_WALLET_ADDRESS_URL,
    keyId: KEY_ID,
    privateKey: process.env.PRIVATE_KEY as string
  })

  const sendingWalletAddress = await opClient.walletAddress.get({
    url: SENDING_WALLET_ADDRESS_URL,
  })

  const receivingWalletAddress = await opClient.walletAddress.get({
    url: RECEIVING_WALLET_ADDRESS_URL,
  })

  const nonce = crypto.randomUUID()
  const outgoingPaymentGrant = await opClient.grant.request(
    {
      url: sendingWalletAddress.authServer
    },
    {
      access_token: {
        access: [
          {
            type: 'outgoing-payment',
            actions: ['read', 'create'],
            /* limits: {
              debitAmount: {
                assetCode: quote.debitAmount.assetCode,
                assetScale: quote.debitAmount.assetScale,
                value: quote.debitAmount.value
              }
            }, */
            identifier: sendingWalletAddress.id
          }
        ]
      },
      interact: {
        start: ['redirect'],
        finish: {
          method: "redirect",
          uri: `http://localhost:3004?paymentId=123`,
          nonce: nonce,
        },
      }
    }
  )

  console.log('\nStep 7: got outgoing payment grant on sending wallet address', outgoingPaymentGrant)

  return {
    error: null,
    redirectTo: (outgoingPaymentGrant as PendingGrant).interact.redirect
  }
}