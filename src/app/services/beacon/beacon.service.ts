import { Injectable } from '@angular/core'
import {
  AccountInfo,
  BeaconEvent,
  Network,
  NetworkType,
  OperationResponseOutput,
  RequestOperationInput,
  SignPayloadResponseOutput,
  TezosOperationType,
} from '@airgap/beacon-sdk'
import { TezosToolkit } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { BeaconWallet } from '@taquito/beacon-wallet'
import { environment } from 'src/environments/environment'
import { StoreService } from '../store/store.service'
import { ready, randombytes_buf } from 'libsodium-wrappers'

const tezos = new TezosToolkit(environment.rpcUrl)

export async function getRandomNumber(num: number): Promise<string> {
  await ready
  const buf = randombytes_buf(Math.ceil(num / 2))

  return buf.join('').slice(0, num)
}

@Injectable({
  providedIn: 'root',
})
export class BeaconService {
  public wallet: BeaconWallet
  public network: Network = { type: NetworkType.MAINNET }

  constructor(private readonly storeService: StoreService) {
    this.wallet = new BeaconWallet({ name: environment.appName })
    this.wallet.client.subscribeToEvent(
      BeaconEvent.ACTIVE_ACCOUNT_SET,
      (activeAccount) => {
        console.log('NEW ACTIVEACCOUNT SET', activeAccount)
      }
    )
    tezos.setWalletProvider(this.wallet)

    // Handle aborted event emitted by the SDK
    this.wallet.client.subscribeToEvent(
      BeaconEvent.OPERATION_REQUEST_ERROR,
      () => {
        this.storeService.resetColorLoadingStates()
      }
    )

    this.getBalances('')
  }

  async setupBeaconWallet(): Promise<AccountInfo | undefined> {
    try {
      return await this.wallet.client.getActiveAccount()
    } catch (error) {
      console.error('Setting up BeaconWallet failed: ', error)
      return undefined
    }
  }

  async openAccountLink(): Promise<void> {
    const activeAccount = await this.wallet.client.getActiveAccount()
    if (activeAccount) {
      const link = await this.wallet.client.blockExplorer.getAddressLink(
        activeAccount.address,
        activeAccount.network
      )
      window.open(link, '_blank')
    }
  }

  async requestPermission(): Promise<AccountInfo | undefined> {
    await this.wallet.requestPermissions({ network: this.network })
    return this.wallet.client.getActiveAccount()
  }

  async sign(message: string): Promise<SignPayloadResponseOutput> {
    return this.wallet.client.requestSignPayload({
      payload: message,
    })
  }

  async operation(
    input: RequestOperationInput
  ): Promise<OperationResponseOutput> {
    return this.wallet.client.requestOperation(input)
  }

  async bid(
    auctionId: number,
    tokenId: number,
    bidAmount: string
  ): Promise<void> {
    this.storeService.setColorLoadingState(tokenId, true)
    this.storeService.setFavorite(tokenId, true)

    const contractInstance = await tezos.wallet.at(
      environment.oneofAuctionContract
    )
    console.log(contractInstance)
    const result = await contractInstance.methods
      .bid(auctionId)
      .toTransferParams()
    const res = await this.wallet.client.requestOperation({
      operationDetails: [
        {
          kind: TezosOperationType.TRANSACTION,
          amount: bidAmount,
          destination: result.to,
          parameters: result.parameter as any,
        },
      ],
    })
    console.log(res)
  }

  async claim(auctionId: number, tokenId: number): Promise<void> {
    this.storeService.setColorLoadingState(tokenId, true)
    this.storeService.setFavorite(tokenId, true)

    const contractInstance = await tezos.wallet.at(
      environment.oneofAuctionContract
    )
    console.log(contractInstance)
    const result = await contractInstance.methods.withdraw(auctionId).send()

    console.log(result)
  }

  async createInitialAuction(tokenId: number): Promise<void> {
    this.storeService.setColorLoadingState(tokenId, true)
    this.storeService.setFavorite(tokenId, true)

    const assetContract = await tezos.wallet.at(environment.oneofContract)
    const auctionContract = await tezos.wallet.at(
      environment.oneofAuctionContract
    )

    const randomNumber = await getRandomNumber(10)

    const result = await assetContract.methods
      .initial_auction(randomNumber, [tokenId])
      .toTransferParams()

    const bidResult = await auctionContract.methods
      .bid(randomNumber)
      .toTransferParams()

    const res = await this.wallet.client.requestOperation({
      operationDetails: [
        {
          kind: TezosOperationType.TRANSACTION,
          amount: '0',
          destination: result.to,
          parameters: result.parameter as any,
        },
        {
          kind: TezosOperationType.TRANSACTION,
          amount: '1000000',
          destination: bidResult.to,
          parameters: bidResult.parameter as any,
        },
      ],
    })

    console.log(res)
  }

  async createAuction(
    owner: string,
    tokenId: number,
    startAmount: string,
    durationDays: string
  ): Promise<void> {
    this.storeService.setColorLoadingState(tokenId, true)
    this.storeService.setFavorite(tokenId, true)

    const amount = new BigNumber(startAmount).shiftedBy(6)
    if (!startAmount || !amount.modulo(100_000).isEqualTo(0)) {
      throw new Error(`Invalid "start amount" ${startAmount}`)
    }
    if (!durationDays || new BigNumber(durationDays).isLessThan(0.5)) {
      throw new Error(`Invalid "duration" ${durationDays}`)
    }

    const durationInSeconds = new BigNumber(durationDays)
      .times(24)
      .times(60)
      .times(60)
      .times(1000)

    const endDate = new Date(
      new Date().getTime() + durationInSeconds.toNumber()
    )

    const contractInstance = await tezos.wallet.at(environment.oneofContract)

    const updateOperatorsResult = await contractInstance.methods
      .update_operators([
        {
          add_operator: {
            owner,
            operator: environment.oneofAuctionContract,
            token_id: tokenId,
          },
        },
      ])
      .toTransferParams()

    const auctionContract = await tezos.wallet.at(
      environment.oneofAuctionContract
    )

    const randomNumber = await getRandomNumber(10)

    const createAuctionResult = await auctionContract.methods
      .create_auction(
        randomNumber, // auction_id
        amount.toString(), // bid_amount
        endDate,
        environment.oneofContract, // token_address
        1, // token_amount (always 1)
        tokenId // token_id
      )
      .toTransferParams()

    const res = await this.wallet.client.requestOperation({
      operationDetails: [
        {
          kind: TezosOperationType.TRANSACTION,
          amount: '0',
          destination: updateOperatorsResult.to,
          parameters: updateOperatorsResult.parameter as any,
        },
        {
          kind: TezosOperationType.TRANSACTION,
          amount: '0',
          destination: createAuctionResult.to,
          parameters: createAuctionResult.parameter as any,
        },
      ],
    })

    console.log(res)
  }

  async reset(): Promise<void> {
    return this.wallet.clearActiveAccount()
  }

  private async getBalances(_userAddress: string) {
    try {
      const contractInstance = await tezos.wallet.at(environment.oneofContract)
      const storage: Storage = await contractInstance.storage()

      console.log(storage)
    } catch (e) {
      console.error(e)
    }
  }
}
