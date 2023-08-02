import React, { useState, useEffect } from 'react';
import './styles.css';
import { Magic } from 'magic-sdk';
import { CosmosExtension } from '@magic-ext/cosmos';
import { StargateClient } from '@cosmjs/stargate';
import { Tx } from 'cosmjs-types/cosmos/tx/v1beta1/tx';
import { MsgSend } from 'cosmjs-types/cosmos/bank/v1beta1/tx';

export default function App() {
  const rpcUrl = 'rpc.sentry-01.theta-testnet.polypore.xyz:26657';
  const [email, setEmail] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [publicAddress, setPublicAddress] = useState('');
  const [userMetadata, setUserMetadata] = useState({});
  const [balance, setBalance] = useState('0');
  const [sendAmount, setSendAmount] = useState(0);
  const [destinationAddress, setDestinationAddress] = useState('');
  const [sendingTransaction, setSendingTransaction] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [sendTokensTxHash, setSendTokensTxHash] = useState('');

  const magic = new Magic("pk_live_D00A9FBB6C2E3435", {
    extensions: {
      cosmos: new CosmosExtension({ rpcUrl }),
    },
  });

  useEffect(() => {
    magic.user.isLoggedIn().then(async magicIsLoggedIn => {
      setIsLoggedIn(magicIsLoggedIn);
      if (magicIsLoggedIn) {
        const metadata = await magic.user.getMetadata();
        fetchBalance(metadata.publicAddress);
        setPublicAddress(metadata.publicAddress);
        setUserMetadata(metadata);
      }
    });
  }, [isLoggedIn]);

  const getCosmosClient = () => {
    return StargateClient.connect(rpcUrl);
  };

  const fetchBalance = async publicAddress => {
    try {
      const client = await getCosmosClient();
      const balances = await client.getAllBalances(publicAddress);
      console.log('Balances', balances);
      setBalance((balances[0]?.amount || 0) / 1000000);
    } catch (error) {
      console.error('Error fetching balance: ', error);
    }
  };

  const login = async () => {
    await magic.auth.loginWithEmailOTP({ email });
    setIsLoggedIn(true);
  };

  const logout = async () => {
    await magic.user.logout();
    setIsLoggedIn(false);
  };

  const handlerSendTokens = async () => {
    try {
      setSendingTransaction(true);
      const res = await magic.cosmos.sendTokens(destinationAddress, sendAmount, 'atom');
      console.log('Res', res);
      setSendingTransaction(false);
      setSendTokensTxHash(`https://explorer.theta-testnet.polypore.xyz/transactions/${res.transactionHash}`);
      const client = await getCosmosClient();
      const transaction = await client.getTx(res.transactionHash);
      console.log('Tansaction', transaction);
      const decodedTransaction = Tx.decode(transaction.tx);
      console.log('Decoded messages:', decodedTransaction.body.messages);
      const sendMessage = MsgSend.decode(decodedTransaction.body.messages[0].value);
      console.log('Sent message:', sendMessage);
      console.log('Gas fee:', decodedTransaction.authInfo.fee.amount);
      console.log('Gas limit:', decodedTransaction.authInfo.fee.gasLimit.toString(10));
    } catch (error) {
      console.error('Error sending tokens: ', error);
    }
  };

  const handlerSendTransaction = async () => {
    setSendingTransaction(true);
    const metadata = await magic.user.getMetadata();

    const message = [
      {
        typeUrl: '/cosmos.bank.v1beta1.MsgSend',
        value: {
          fromAddress: metadata.publicAddress,
          toAddress: destinationAddress,
          amount: [
            {
              amount: String(sendAmount),
              denom: 'atom',
            },
          ],
        },
      },
    ];
    const fee = {
      amount: [{ denom: 'uatom', amount: '500' }],
      gas: '200000',
    };

    const res = await magic.cosmos.signAndBroadcast(message, fee);
    console.log('Res', res);
    setSendingTransaction(false);

    setTxHash(`https://explorer.theta-testnet.polypore.xyz/transactions/${res.transactionHash}`);
    const client = await getCosmosClient();
    const transaction = await client.getTx(res.transactionHash);
    console.log('Transaction', transaction);
    const decodedTransaction = Tx.decode(transaction.tx);
    console.log('Decoded messages:', decodedTransaction.body.messages);
    const sendMessage = MsgSend.decode(decodedTransaction.body.messages[0].value);
    console.log('Sent message:', sendMessage);
    console.log('Gas fee:', decodedTransaction.authInfo.fee.amount);
    console.log('Gas limit:', decodedTransaction.authInfo.fee.gasLimit.toString(10));
  };

  const handleSignOnly = async () => {
    const metadata = await magic.user.getMetadata();

    const message = [
      {
        typeUrl: '/cosmos.bank.v1beta1.MsgSend',
        value: {
          fromAddress: metadata.publicAddress,
          toAddress: destinationAddress,
          amount: [
            {
              amount: String(sendAmount),
              denom: 'atom',
            },
          ],
        },
      },
    ];
    const fee = {
      amount: [{ denom: 'uatom', amount: '500' }],
      gas: '200000',
    };

    const result = await magic.cosmos.sign(message, fee);

    setTxHash('Check Your Result in Console!');

    console.log('Signed transaction', result);
  };

  return (
    <div className="App">
      {!isLoggedIn ? (
        <div className="container">
          <h1>Please sign up or login</h1>
          <input
            type="email"
            name="email"
            required="required"
            placeholder="Enter your email"
            onChange={event => {
              setEmail(event.target.value);
            }}
          />
          <button onClick={login}>Send</button>
        </div>
      ) : (
        <div>
          <div className="container">
            <h1>Current user: {userMetadata.email}</h1>
            <button onClick={logout}>Logout</button>
          </div>
          <div className="container">
            <h1>Cosmos address</h1>
            <div className="info">{publicAddress}</div>
          </div>
          <div className="container">
            <h1>Balance</h1>
            <div className="info">{balance} ATOM</div>
          </div>
          <div className="container">
            <h1>Send Tokens</h1>
            {sendTokensTxHash ? (
              <div>
                <div>Send transaction success</div>
                <div className="info">{sendTokensTxHash}</div>
              </div>
            ) : sendingTransaction ? (
              <div className="sending-status">Sending transaction</div>
            ) : (
              <div />
            )}
            <input
              type="text"
              name="destination"
              className="full-width"
              required="required"
              placeholder="Destination address"
              onChange={event => {
                setDestinationAddress(event.target.value);
              }}
            />
            <input
              type="text"
              name="amount"
              className="full-width"
              required="required"
              placeholder="Amount in tokens"
              onChange={event => {
                setSendAmount(event.target.value);
              }}
            />
            <button id="btn-send-txn" onClick={handlerSendTokens}>
              Send Transaction
            </button>
          </div>
          <div className="container">
            <h1>Send Transaction</h1>
            {txHash ? (
              <div>
                <div>Send transaction success</div>
                <div className="info">{txHash}</div>
              </div>
            ) : sendingTransaction ? (
              <div className="sending-status">Sending transaction</div>
            ) : (
              <div />
            )}
            <input
              type="text"
              name="destination"
              className="full-width"
              required="required"
              placeholder="Destination address"
              onChange={event => {
                setDestinationAddress(event.target.value);
              }}
            />
            <input
              type="text"
              name="amount"
              className="full-width"
              required="required"
              placeholder="Amount in tokens"
              onChange={event => {
                setSendAmount(event.target.value);
              }}
            />
            <button id="btn-send-txn" onClick={handlerSendTransaction}>
              Send Transaction
            </button>
            <button id="btn-send-txn" onClick={handleSignOnly}>
              Sign Transaction Only
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
