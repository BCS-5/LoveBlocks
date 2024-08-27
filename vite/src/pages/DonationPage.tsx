import { FC, useEffect, useRef, useState } from "react";
import { useLocation, useOutletContext } from "react-router-dom";
import SignatureButton from "../components/SignatureButton";
import { OutletContext } from "../components/Layout";
import commonCard from "../assets/common.jpeg";
import logo from "../assets/logo.png";
import { ethers } from "ethers";
import { format, differenceInDays } from "date-fns";
import "../styles/TokenCardAnimation.css";
import "../styles/DonationModal.css";
import mintNftAbi from "../abis/mintNftAbi.json";
import { mintNftContractAddress } from "../abis/contarctAddress";
import DonationModal from "../components/DonationCompleModal";
import * as htmlToImage from "html-to-image";
import NftChart from "../components/NftChart";
import authImage from "../assets/LoveblocksPrivy.png";

interface HoldToken {
  tokenAddress: string;
  amount: bigint;
  name: string;
  symbol: string;
  decimal: bigint;
  image: string;
}

interface TokenPrice {
  id: string;
  usd: string;
}

interface MergeToken {
  tokenAddress: string;
  amount: bigint;
  name: string;
  symbol: string;
  decimal: bigint;
  image: string;
  usd: string;
}

const DonationPage: FC = () => {
  const { signer, adminSigner } = useOutletContext<OutletContext>();
  const location = useLocation();
  const { holdTokens, tokenPrice } = location.state || {
    holdTokens: [],
    tokenPrice: [],
  };
  const [mergeTokens, setMergeTokens] = useState<MergeToken[]>();
  const [selectedTokens, setSelectedTokens] = useState<MergeToken[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDonationComplete, setIsDonationComplete] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mention, setMention] = useState("");

  const donationInfo = {
    title: "기부 제목",
    organizationName: "기부 단체 이름",
    description:
      "이 글은 기부의 목적과 기부금의 사용처에 대한 내용을 담고 있습니다. 기부해주신 분들께 깊이 감사드립니다.",
    totalAmount: "100 ETH",
    totalDonors: 50,
    startDate: new Date(2024, 7, 1),
    endDate: new Date(2024, 8, 30),
  };

  const today = new Date();
  const dDay = differenceInDays(donationInfo.endDate, today);
  const formattedStartDate = format(donationInfo.startDate, "yyyy-MM-dd");
  const formattedEndDate = format(donationInfo.endDate, "yyyy-MM-dd");

  const toggleTokenSelection = (token: MergeToken) => {
    setSelectedTokens((prevSelectedTokens) => {
      const isSelected = prevSelectedTokens.some(
        (selectedToken) => selectedToken.tokenAddress === token.tokenAddress
      );
      if (isSelected) {
        return prevSelectedTokens.filter(
          (selectedToken) => selectedToken.tokenAddress !== token.tokenAddress
        );
      } else {
        return [...prevSelectedTokens, token];
      }
    });
  };

  const totalSelectedAmount = selectedTokens.reduce(
    (total, token) =>
      total +
      parseFloat(
        (
          Number(ethers.formatUnits(token.amount, token.decimal)) *
          Number(token.usd)
        ).toFixed(2)
      ),
    0
  );

  const onSignatureSuccess = async () => {
    console.log("Signature was successful!");
    setProgress(33);
    setMention("NFT 생성 중...");
    await mintNft();
    setProgress(66);
    setMention("NFT 업로드 중...");

    setIsLoading(false);
    setProgress(100);
    setMention("기부 완료!");
    setIsDonationComplete(true);
  };

  const chartContainerRef = useRef<HTMLDivElement>(null);

  const mintNft = async () => {
    const mintNftContract = new ethers.Contract(
      mintNftContractAddress,
      mintNftAbi,
      adminSigner
    );

    try {
      // 이미지와 JSON을 IPFS에 업로드하고, NFT를 발행하는 코드
      const imgIPFS = await pinFileToIPFS();
      const jsonIPFS = await pinJsonToIPFS(imgIPFS);
      const response = await mintNftContract.mintNft(
        "https://rose-top-beetle-859.mypinata.cloud/ipfs/" + jsonIPFS
      );
      await response.wait();
    } catch (error) {
      console.error(error);
      setMention("NFT 생성에 실패했습니다.");
    }
  };

  const pinFileToIPFS = async (): Promise<string> => {
    if (chartContainerRef.current === null) {
      return "";
    }

    const dataUrl = await htmlToImage.toPng(chartContainerRef.current, {
      backgroundColor: "white",
    });
    const blob = await (await fetch(dataUrl)).blob();

    try {
      const data = new FormData();
      data.append("file", blob, "tokenInfo.png");

      const metadata = JSON.stringify({
        name: "DONATION_NFT",
      });

      data.append("pinataMetadata", metadata);

      const pinataOptions = JSON.stringify({
        cidVersion: 0,
      });

      data.append("pinataOptions", pinataOptions);

      const response = await fetch(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_APP_PINATA_JWT}`,
          },
          body: data,
        }
      );

      if (!response.ok) {
        console.error("Failed to upload file:", response.statusText);
        setMention("파일 업로드에 실패했습니다.");
      }

      const result = await response.json();
      return result.IpfsHash;
    } catch (error) {
      console.error("Error uploading file:", error);
      setMention("파일 업로드 중 오류가 발생했습니다.");
      throw error;
    }
  };

  const pinJsonToIPFS = async (imgIPFS: string): Promise<string> => {
    const jsonData = {
      image: "https://gateway.pinata.cloud/ipfs/" + imgIPFS,
      attributes: [
        {
          trait_type: "기부일",
          value: "123123",
        },
        {
          trait_type: "기부단체명",
          value: "55555",
        },
      ],
    };

    const apiKey = `${import.meta.env.VITE_APP_PINATA_API_KEY}`;
    const secretApiKey = `${import.meta.env.VITE_APP_PINATA_API_SECRET_KEY}`;

    try {
      const response = await fetch(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            pinata_api_key: apiKey,
            pinata_secret_api_key: secretApiKey,
          },
          body: JSON.stringify(jsonData),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to pin JSON to IPFS");
      }

      const data = await response.json();
      return data.IpfsHash;
    } catch (error) {
      console.error("Error pinning JSON to IPFS:", error);
      setMention("JSON 업로드에 실패했습니다.");
      throw error;
    }
  };

  useEffect(() => {
    const mergedTokens = holdTokens.map((token: HoldToken) => {
      const matchingPrice = tokenPrice.find((price: TokenPrice) => {
        return price.id.includes(token.symbol.toLowerCase());
      });

      return {
        ...token,
        usd: matchingPrice ? matchingPrice.usd : null,
      };
    });

    setMergeTokens(mergedTokens);
  }, [tokenPrice]);

  return (
    <div
      className={`min-h-screen flex flex-col font-sans ${
        isLoading ? "opacity-50" : ""
      }`}
    >
      <main className="flex-grow">
        <section className="bg-white py-12 px-4 sm:px-6 lg:px-8 shadow-md rounded-lg mt-10 mx-4">
          <div className="max-w-7xl mx-auto">
            {/* 기부 단체 설명 섹션 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 items-center">
              {/* 좌측 이미지 */}
              <div className="rounded-lg overflow-hidden shadow-lg">
                <img
                  src={commonCard}
                  alt="Donation Organization"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* 우측 설명 */}
              <div className="flex flex-col justify-center text-left space-y-4">
                <h2 className="text-3xl font-extrabold text-gray-900">
                  {donationInfo.title}
                </h2>
                <h3 className="text-xl text-gray-700">
                  {donationInfo.organizationName}
                </h3>
                <div className="text-gray-600 leading-relaxed max-h-40 overflow-y-auto pr-2">
                  {donationInfo.description}
                </div>
                <div className="text-gray-800 font-medium space-y-1">
                  <p>
                    모금액:{" "}
                    <span className="font-bold text-gray-900">
                      {donationInfo.totalAmount}
                    </span>
                  </p>
                  <p>
                    기부자 수:{" "}
                    <span className="font-bold text-gray-900">
                      {donationInfo.totalDonors}명
                    </span>
                  </p>
                  <p>
                    기부 기간:{" "}
                    <span className="font-bold text-gray-900">
                      {formattedStartDate} ~ {formattedEndDate}
                    </span>
                  </p>
                  <p>
                    D-Day:{" "}
                    <span className="font-bold text-red-500">
                      {dDay >= 0 ? `D-${dDay}` : "종료됨"}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* 토큰 목록 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-60">
              {mergeTokens! ? (
                mergeTokens!.map((token: MergeToken) => (
                  <div
                    key={token.tokenAddress}
                    className={`p-6 rounded-lg shadow-md text-center cursor-pointer transition-transform transform hover:scale-105 ${
                      selectedTokens.some(
                        (selectedToken) =>
                          selectedToken.tokenAddress === token.tokenAddress
                      )
                        ? "selected-token-card"
                        : "border border-gray-200"
                    }`}
                    style={{
                      // backgroundImage: `url(${silverCard})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                      backgroundBlendMode: "overlay",
                    }}
                    onClick={() => toggleTokenSelection(token)}
                  >
                    <img
                      src={token.image}
                      alt={token.name}
                      className="w-16 h-16 mx-auto rounded-full"
                    />
                    <h3 className="text-xl font-bold mt-4 text-gray-800">
                      {token.symbol.toUpperCase()}
                    </h3>
                    <p className="mt-2 text-gray-600">
                      잔액:{" "}
                      {(
                        Number(
                          ethers.formatUnits(token.amount, token.decimal)
                        ) * Number(token.usd)
                      ).toFixed(2)}
                      $
                    </p>
                  </div>
                ))
              ) : (
                <p className="mt-4 text-lg text-center text-gray-600">
                  보유한 토큰이 없습니다.
                </p>
              )}
            </div>
          </div>

          <div className="fixed bottom-0 left-0 w-full bg-white shadow-lg py-4 px-6 flex justify-between items-center space-x-4 border-t border-gray-200">
            {/* 왼쪽: 그래프 */}
            <div
              ref={chartContainerRef}
              className="w-2/5 flex flex-col justify-between items-center h-60 relative rounded-md bg-gray-700"
            >
              {/* 로고와 텍스트 */}
              <div className="absolute top-0 left-0 flex items-center space-x-2 p-2">
                <img src={logo} alt="LoveBlocks Logo" className="h-5 w-5" />
                <span className="text-sm font-bold text-gray-100">
                  LOVEBLOCKS
                </span>{" "}
                {/* 텍스트 색상도 어두운 배경에 맞게 변경 */}
              </div>

              {/* 명함 크기의 그래프 자리 */}
              <div className="flex-grow flex items-end justify-center w-full mb-4">
                <NftChart tokens={selectedTokens} />
              </div>
            </div>

            {/* 오른쪽: 선택된 토큰들 및 총량/버튼 */}
            <div className="w-3/5 flex flex-col justify-between h-60 overflow-hidden">
              <div className="flex flex-wrap items-center space-x-2 overflow-x-auto">
                {selectedTokens.map((token) => (
                  <div
                    key={token.tokenAddress}
                    className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-1 shadow-sm"
                  >
                    <img
                      src={token.image}
                      className="w-8 h-8 rounded-full"
                      alt={token.name}
                    />
                    <span className="text-sm font-medium text-gray-800">
                      {token.symbol.toUpperCase()}:{" "}
                      {(
                        Number(
                          ethers.formatUnits(token.amount, token.decimal)
                        ) * Number(token.usd)
                      ).toFixed(2)}
                      $
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-4 p-4 rounded-lg shadow-md">
                <div className="text-gray-900 font-bold text-lg">
                  예상 기부 량 : {totalSelectedAmount}$
                </div>
                <SignatureButton
                  signer={signer}
                  selectedTokens={selectedTokens}
                  adminSigner={adminSigner}
                  onSuccess={onSignatureSuccess}
                  setLoading={setIsLoading}
                  setProgress={setProgress}
                  setMention={setMention}
                ></SignatureButton>
              </div>
            </div>
          </div>
        </section>
        <div className="container mx-auto px-4 py-8">
          <section className="flex flex-col md:flex-row items-center justify-between">
            <div className="w-full md:w-1/2 mb-8 md:mb-0 flex justify-center">
              <img
                src={authImage}
                alt="Auth Compatibility"
                className="w-[50%]"
              />
            </div>
            <div className="w-full md:w-1/2 md:pl-8">
              <h2 className="text-3xl font-semibold text-blue-700 mb-4">
                간단하게 지갑만 연동하세요
              </h2>
              <p className="text-gray-600">
                수수료없이 지갑들에 숨어있는 작은코인들이 모여서 LOVEBLOCKS를
                만들어갑니다
              </p>
            </div>
          </section>
        </div>
      </main>

      {isDonationComplete && (
        <DonationModal
          onClose={() => setIsDonationComplete(false)}
          className="z-60"
        />
      )}

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96 h-25">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold">{mention}</h2>
              <p>진행률: {progress}%</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
              <div
                className="bg-blue-500 h-4 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DonationPage;
