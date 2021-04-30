import React, { useState, useEffect } from "react";
import "./styles.css";
import { Magic } from "magic-sdk";
import { CosmosExtension } from "@magic-ext/cosmos";
import { coins } from "@cosmjs/launchpad";

const magic = new Magic("pk_test_60CB978950B2501B", {
    extensions: {
        cosmos: new CosmosExtension({
            rpcUrl: "http://localhost:1317"
        })
    }
});

export default function App() {
    const [email, setEmail] = useState("");
    const [publicAddress, setPublicAddress] = useState("");
    const [destinationAddress, setDestinationAddress] = useState("");
    const [sendAmount, setSendAmount] = useState(0);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userMetadata, setUserMetadata] = useState({});
    const [txHash, setTxHash] = useState("");
    const [sendingTransaction, setSendingTransaction] = useState(false);

    useEffect(() => {
        magic.user.isLoggedIn().then(async (magicIsLoggedIn) => {
            setIsLoggedIn(magicIsLoggedIn);
            if (magicIsLoggedIn) {
                const metadata = await magic.user.getMetadata()
                setPublicAddress(metadata.publicAddress);
                setUserMetadata(metadata);
            }
        });
    }, [isLoggedIn]);

    const login = async () => {
        await magic.auth.loginWithMagicLink({ email });
        setIsLoggedIn(true);
    };

    const logout = async () => {
        await magic.user.logout();
        setIsLoggedIn(false);
    };

    const handlerSendTransaction = async () => {
        setSendingTransaction(true);
        const metadata = await magic.user.getMetadata();

        const message = [
            {
                "type": "cosmos-sdk/MsgSend",
                "value": {
                    "amount": [
                        {
                            "amount": sendAmount,
                            "denom": "token"
                        }
                    ],
                    "from_address": metadata.publicAddress,
                    "to_address": destinationAddress
                }
            }
        ];
        const fee = {
            amount: coins(0, "token"),
            gas: "200000",
        };

        const result = await magic.cosmos.signAndBroadcast(message, fee);
        setSendingTransaction(false);

        setTxHash(result.transactionHash);

        console.log("send transaction", result);
    };

    const handleSignOnly = async () => {
        const metadata = await magic.user.getMetadata();

        const fee = {
            amount: coins(0, "token"),
            gas: "200000", // 180k
        };

        const message = [
            {
                "type": "cosmos-sdk/MsgSend",
                "value": {
                    "amount": [
                        {
                            "amount": sendAmount,
                            "denom": "token"
                        }
                    ],
                    "from_address": metadata.publicAddress,
                    "to_address": destinationAddress
                }
            }
        ];

        const result = await magic.cosmos.sign(message, fee);

        setTxHash('Check Your Result in Console!');

        console.log("Signed transaction", result);
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
                        onChange={(event) => {
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
                            onChange={(event) => {
                                setDestinationAddress(event.target.value);
                            }}
                        />
                        <input
                            type="text"
                            name="amount"
                            className="full-width"
                            required="required"
                            placeholder="Amount in tokens"
                            onChange={(event) => {
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
