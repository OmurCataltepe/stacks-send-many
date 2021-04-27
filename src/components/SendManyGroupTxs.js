import { hexToCV } from '@stacks/transactions';
import React, { useRef, useState, useEffect } from 'react';
import { CONTRACT_ADDRESS } from '../lib/constants';

import { getTx } from '../lib/transactions';

export function SendManyGroupTxs({ ownerStxAddress, userSession, txList }) {
  const spinner = useRef();
  const [status, setStatus] = useState();
  const [tx, setTx] = useState();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (txList && txList.length > 0) {
      setLoading(true);

      const loadTxs = async () => {
        try {
          const firstTx = await getTx(txList[0], userSession);
          console.log(firstTx.apiData.events.length, firstTx.apiData.event_count);
          for (let i = 1; i < txList.length; i++) {
            const transaction = await getTx(txList[i], userSession);
            firstTx.apiData.events = firstTx.apiData.events.concat(transaction.apiData.events);
            firstTx.apiData.event_count += transaction.apiData.event_count;
            console.log(firstTx.apiData.events.length, firstTx.apiData.event_count);
          }
          setTx(firstTx);
          setLoading(false);
        } catch (e) {
          setStatus(`Failed to get transactions`);
          console.log(e);
          setLoading(false);
        }
      };
      loadTxs();
    }
  }, [txList, userSession]);

  const txEvents =
    tx &&
    tx.apiData &&
    tx.apiData.events.filter(event => {
      return event.event_type === 'stx_asset';
    });
  txEvents &&
    txEvents.sort((e1, e2) =>
      (e1.asset.recipient !== ownerStxAddress && e2.asset.recipient !== ownerStxAddress) ||
      (e1.asset.recipient === ownerStxAddress && e2.asset.recipient === ownerStxAddress)
        ? e1.asset.recipient > e2.asset.recipient
        : e1.asset.recipient === ownerStxAddress
        ? -1
        : 1
    );
  const showMemo =
    tx && tx.apiData.contract_call.contract_id === `${CONTRACT_ADDRESS}.send-many-memo`;
  const memos = showMemo
    ? new Array(
        ...new Set(
          tx.apiData.events.filter((_, index) => index % 2 === 1).map(e => e.contract_log.value.hex)
        )
      )
    : [];
  console.log(txEvents);
  const showMemoPerRecipient = showMemo && memos.length > 1;
  return (
    <div>
      <div
        ref={spinner}
        role="status"
        className={`${
          loading ? '' : 'd-none'
        } spinner-border spinner-border-sm text-info align-text-top mr-2`}
      />
      {tx && tx.apiData && (
        <>
          {tx.apiData.burn_block_time_iso} ({tx.apiData.tx_status})
          <br />
          from{' '}
          <span
            className={`${tx.apiData.sender_address === ownerStxAddress ? 'font-weight-bold' : ''}`}
          >
            <Address addr={tx.apiData.sender_address} />
          </span>
          <br />
          {showMemo && !showMemoPerRecipient && <>"{hexToCV(memos[0]).buffer.toString()}"</>}
        </>
      )}

      {txEvents &&
        txEvents.map((event, key) => {
          const memo =
            showMemo &&
            showMemoPerRecipient &&
            hexToCV(
              tx.apiData.events[event.event_index + 1].contract_log.value.hex
            ).buffer.toString();
          return (
            <div key={key} className="container">
              <StxTransfer asset={event.asset} ownerStxAddress={ownerStxAddress} memo={memo} />
            </div>
          );
        })}
      {tx && !tx.apiData && tx.data && <>Transaction not found on server.</>}
      {!loading && !tx && <>No transactions found with id {JSON.stringify(txList)}.</>}
      {status && (
        <>
          <div>{status}</div>
        </>
      )}
    </div>
  );
}

function StxTransfer({ asset, ownerStxAddress, memo }) {
  return (
    <div className="row">
      <div
        className={`col-xs-12 col-md-6 text-right" ${
          asset.recipient === ownerStxAddress ? 'font-weight-bold' : ''
        }`}
      >
        {'->'} <Address addr={asset.recipient} ownerStxAddress={ownerStxAddress} />
      </div>
      <div
        className={`col-xs-12 col-md-6 text-right ${
          asset.recipient === ownerStxAddress ? 'font-weight-bold' : ''
        }`}
      >
        {(asset.amount / 1000000).toLocaleString(undefined, {
          style: 'decimal',
          minimumFractionDigits: 6,
          maximumFractionDigits: 6,
        })}
        Ӿ
      </div>
      {memo && (
        <div className="col-xs-12 col-md-12">
          <small>{memo}</small>
        </div>
      )}
    </div>
  );
}
function Address({ addr }) {
  return (
    <>
      {addr.substr(0, 5)}...{addr.substr(addr.length - 5)}
    </>
  );
}
