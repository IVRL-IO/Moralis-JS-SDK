import verifyChainId from '../utils/verifyChainId';
import AbstractWeb3Connector from './AbstractWeb3Connector';
import { ConnectorEvents } from './events';
import { getMoralisRpcs } from './MoralisRpcs';

export const WalletConnectEvent = Object.freeze({
  ACCOUNTS_CHANGED: 'accountsChanged',
  CHAIN_CHANGED: 'chainChanged',
  DISCONNECT: 'disconnect',
});

/**
 * Connector to connect an WalletConnect provider to Moralis
 * Note: this assumes using WalletConnect v1
 * // TODO: support WalletConnect v2
 */

class WalletConnectWeb3ConnectorElectron extends AbstractWeb3Connector {
  type = 'WalletConnectElectron';

  async activate({ chainId: providedChainId, mobileLinks, newSession } = {}) {
    // Log out of any previous sessions
    if (newSession) {
      this.cleanup();
    }

    if (!this.provider) {
      let WalletConnectProvider;
      const config = {
        rpc: getMoralisRpcs('WalletConnect'),
        chainId: providedChainId,
        qrcode: false,
      };

      try {
        WalletConnectProvider = require('@walletconnect/web3-provider')?.default;
      } catch (error) {
        // Do nothing. User might not need walletconnect
      }

      if (!WalletConnectProvider) {
        // eslint-disable-next-line no-undef
        WalletConnectProvider = window?.WalletConnectProvider?.default;
      }

      if (!WalletConnectProvider) {
        throw new Error(
          'Cannot enable via WalletConnect: dependency "@walletconnect/web3-provider" is missing'
        );
      }

      if (typeof WalletConnectProvider === 'function') {
        this.provider = new WalletConnectProvider(config);
      } else {
        // eslint-disable-next-line no-undef
        this.provider = new window.WalletConnectProvider(config);
      }
      this.provider.connector.on('display_uri', (err, payload) => {
        const uri = payload.params[0];
        // eslint-disable-next-line no-console
        console.dir(payload);
        // eslint-disable-next-line no-console
        console.log(uri);
      });
      await this.provider.enable();
    }

    if (!this.provider) {
      throw new Error('Could not connect via WalletConnect, error in connecting to provider');
    }

    const accounts = await this.provider.enable();
    const account = accounts[0].toLowerCase();
    const { chainId } = this.provider;
    const verifiedChainId = verifyChainId(chainId);

    this.account = account;
    this.chainId = verifiedChainId;

    this.subscribeToEvents(this.provider);

    return { provider: this.provider, account, chainId: verifiedChainId };
  }

  // Cleanup old sessions
  cleanup() {
    try {
      // eslint-disable-next-line no-undef
      if (window) {
        // eslint-disable-next-line no-undef
        window.localStorage.removeItem('walletconnect');
      }
    } catch (error) {
      // Do nothing
    }
  }

  async deactivate() {
    this.unsubscribeToEvents(this.provider);

    if (this.provider) {
      try {
        await this.provider.close();
      } catch {
        // Do nothing
      }
    }

    this.account = null;
    this.chainId = null;
    this.provider = null;
  }
}

export default WalletConnectWeb3ConnectorElectron;
