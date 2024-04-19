const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');

async function main() {
    const provider = new WsProvider('ws://127.0.0.1:9944');
    const api = await ApiPromise.create({ provider });
    await api.isReady;

    const keyring = new Keyring({ type: 'sr25519' });
    const sender = keyring.addFromUri('//Alice'); // Ensure Alice has sufficient funds

    // Function to send a single transaction
    async function sendTransaction(api, sender, value, nonce) {
        return new Promise((resolve, reject) => {
            api.tx.templateModule
                .doSomething(value)
                .signAndSend(sender, { nonce }, ({ status, dispatchError }) => {
                    if (status.isFinalized) {
                        console.log(`Transaction with value ${value} and nonce ${nonce} finalized.`);
                        resolve(status.asFinalized.toString());
                    } else if (dispatchError) {
                        console.error(`Dispatch Error: ${dispatchError.toString()}`);
                        reject(dispatchError);
                    }
                });
        });
    }

    // Function to send a batch of transactions
    async function sendBatch(api, sender, startValue, batchCount, initialNonce) {
        let results = [];
        for (let i = 0; i < batchCount; i++) {
            const value = startValue + i;
            const nonce = initialNonce.addn(i);
            results.push(sendTransaction(api, sender, value, nonce));
        }
        return Promise.all(results);
    }

    // Initial nonce for the sender
    const initialNonce = await api.rpc.system.accountNextIndex(sender.address);

    // Parameters for batch transactions
    const batches = 3; // Number of batches
    const transactionsPerBatch = 3; // Transactions per batch, testing the limit

    for (let batch = 0; batch < batches; batch++) {
        console.log(`Sending batch ${batch + 1}`);
        try {
            const results = await sendBatch(api, sender, 10 + batch * transactionsPerBatch, transactionsPerBatch, initialNonce.addn(batch * transactionsPerBatch));
            console.log(`All transactions from batch ${batch + 1} finalized:`, results);
        } catch (error) {
            console.error(`Error with batch ${batch + 1}:`, error);
        }
        await new Promise(resolve => setTimeout(resolve, 10000)); // Delay to allow block finalization and limit reset
    }
}

main().catch(console.error);
