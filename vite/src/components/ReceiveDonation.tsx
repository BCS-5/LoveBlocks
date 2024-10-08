import { ethers, JsonRpcSigner } from "ethers";
import { FC, useEffect, useState } from "react";
import { Contract } from "ethers";
import { Wallet } from "ethers";
import axios from "axios";
import donationAbi from "../abis/donationAbi.json";
import { donationContractAddress } from "../abis/contarctAddress";
import ButtonTemplate from "./BottonTemplate";

interface ReceiveDonationProps {
  signer: JsonRpcSigner | null;
  contract: Contract;
  adminSigner: Wallet | null;
}

const ReceiveDonation: FC<ReceiveDonationProps> = ({
  signer,
  contract,
  adminSigner,
}) => {
  const [multiSigAddr, setMultiSigAddr] = useState<string>();
  const [multiSigWalletContract, setMultiSigWalletContract] =
    useState<Contract>();
  const [multiSigWalletContractAdmin, setMultiSigWalletContractAdmin] =
    useState<Contract>();
  const [usdtContract, setUsdtContract] = useState<Contract>();
  const [transactionId, setTransactionId] = useState<string>("");
  const [donationContract, setDonationContract] = useState<Contract>()
  // const [confirm, setConfirm] = useState<boolean>(false);

  const usdtAddr = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
  const usdtAbi = ["function transfer(address to, uint amount) returns (bool)"];

  useEffect(() => {
    if (!signer) return;

    const donationContract = new ethers.Contract(
      donationContractAddress,
      donationAbi,
      signer
    );

    setDonationContract(donationContract);
    getMultiSigAddr();
  }, [signer]);

  useEffect(() => {
    if (!multiSigAddr) return;
    console.log("multiSigAddr ", multiSigAddr);
    //multisig contract 설정
    const abi = [
      "function submitTransaction(address destination, uint value, bytes data) returns (uint transactionId)",
      "function executeTransaction(uint transactionId)",
      "function confirmations(uint transactionId, address owner) view returns (bool)",
      "function transactionCount() view returns (uint)",
      "function transactions(uint transactionId) view returns (address destination, uint value, bytes data, bool executed)",
      "function confirmTransaction(uint transactionId)",
    ];
    const contractAdmin = new ethers.Contract(multiSigAddr, abi, adminSigner);
    const contract = new ethers.Contract(multiSigAddr, abi, signer);

    setMultiSigWalletContractAdmin(contractAdmin);
    setMultiSigWalletContract(contract);

    //usdt contract 설정
    const usdtCon = new ethers.Contract(usdtAddr, usdtAbi, signer);
    setUsdtContract(usdtCon);
  }, [multiSigAddr]);

  const getConfirmations = async () => {
    //제일 마지막 tx를 가져오는거긴한데, 애초에 수령 신청하고 승인 안된 상태면 클릭 못하게 막아야할듯
    const txId = await multiSigWalletContract!.transactionCount();
    const res3 = await multiSigWalletContract!.transactions(txId);
    const res = await multiSigWalletContract!.confirmations(
      txId - 1n,
      signer?.address
    );
    console.log("RESPONSE ", txId - 1n, res);
    console.log("RESONPSE 3", res3);

    //admin이 confirm 진행
    const res4 = await multiSigWalletContractAdmin!.confirmTransaction(txId);
    // const res4 = await multiSigWalletContractAdmin!.confirmations(
    //   txId,8
    console.log("RES4 ", res4);
    // setConfirm(res4 ? true : false);
  };

  // useEffect(() => {
  //   if (!confirm) return;
  //   check();
  // }, [confirm]);

  // const check = async () => {
  //   const txId = await multiSigWalletContract!.transactionCount();
  //   const res = await multiSigWalletContract!.confirmations(
  //     txId - 2n,
  //     adminSigner?.address
  //   );
  //   console.log(txId - 2n, res);

  //   const result = await multiSigWalletContract!.executeTransaction(txId - 2n);
  //   console.log(result);
  // };

  const getMultiSigAddr = async () => {
    //signer가 등록한 첫 multisig CA
    const addr = await contract.instantiations(signer?.address, 0);
    setMultiSigAddr(addr);
  };

  const recevieDonation = async () => {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=krw"
    );
    console.log(response.data.tether.krw);

    //donation컨트랙트의 usedDonation메서드 호출 -> 누적된 사용금액(원화) -> 값 / response.data.tether.krw -> 테더량
    const usedDonation = await donationContract!.usedDonation();
    console.log("usedDonation",usedDonation);

    const usdtPrice = Math.floor(Number(usedDonation)/Number(response.data.tether.krw)*100)/100;
    // console.log("CALC",((response.data.tether.krw*100)/Number(usedDonation))/100)

    // const amount = ethers.parseUnits(usdtPrice.toString(), 6); //기부 contract에서 영수증 인증된 금액 가져와야함
    const amount = ethers.parseUnits("0.013", 6); //기부 contract에서 영수증 인증된 금액 가져와야함
    console.log("amount",amount)
    const encodeData = usdtContract?.interface.encodeFunctionData("transfer", [
      signer?.address,
      amount,
    ]);

    const txId = await multiSigWalletContract!.submitTransaction(
      usdtAddr,
      0,
      encodeData
    );

    setTransactionId(txId);
    console.log("TXID", txId);
  };

  useEffect(() => {
    if (!transactionId) return;
    getConfirmations();
  }, [transactionId]);
  

  return (
    <div className="flex justify-end">
      <button onClick={recevieDonation} className="w-28 py-2 text-sm bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600">기부금 수령</button>
    </div>
  );
};

export default ReceiveDonation;
