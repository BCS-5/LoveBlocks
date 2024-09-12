# LoveBlocks

### 블록체인 기반 마이크로 기부 플랫폼

---

### 개발 환경

![image](https://github.com/user-attachments/assets/42f665c6-338d-47aa-a885-da4c596d55bf)

[Front-end]

- 사용 스택 : React, JavaScript, Tailwind
- IDE : VS code

[BlockChain]

- 사용 스택 : Solidity, Ethers.js, Hardhat
- IDE : Remix, VS code

### 서비스 주요 기능 :

- **토큰 기부 기능**
    - 토큰 잔액 조회
        - Coingecko API를 사용해 Arbitrum 체인 내 존재하는 모든 토큰 정보 수집
        - 각 토큰 별 CA를 통해 signer의 EOA에 대한 balance를 조회하는 방식으로 지갑 내 토큰 잔액 조회 기능 구현
        
    - 기부금 수수료 대납
        - EIP-2612의 permit 기능을 사용해 기부자의 기부금을 서명으로 처리
        - 서명을 DB에 저장 후 10개가 되면 수수료 절감을 위해 여러개의 서명을 한번에 transferFrom 처리
        
    - 토큰 가격 실시간 조회
        - Coingecko API를 사용해서 Arbitrum체인 내 존재하는 토큰가격 실시간 정보 수집
        - 토큰 가격 정보를 캐시에 저장하여 API 호출 횟수를 줄임. 캐시된 가격 정보는 5분 동안 유효하며, 이 기간 동안은 API를 다시 호출하지 않고 캐시된 정보를 사용
    
- **토큰 스왑 -** Uniswap([IUniswapV2Router02](https://github.com/Uniswap/v2-periphery/blob/master/contracts/interfaces/IUniswapV2Router02.sol), [IUniswapV2Factory](https://github.com/Uniswap/v2-core/blob/master/contracts/interfaces/IUniswapV2Factory.sol))
    - 기부 토큰 → USDT swap
        - IUniswapV2Factory의 getPair메서드를 통해 기부 토큰과 USDT 간 pool 여부 파악 및 path 설정
        - IUniswapV2Router02의 swapExactTokensForTokens 메서드를 통해 멀티시그 CA에게 swap된 USDT 전송
        
- **멀티 시그 월렛 기능**
    
     - Gnosis MultiSig Wallet([MultiSigWallet](https://github.com/gnosis/MultiSigWallet/blob/master/contracts/MultiSigWallet.sol)**,** [MultiSigWalletFactory](https://github.com/gnosis/MultiSigWallet/blob/master/contracts/MultiSigWalletFactory.sol), [Factory](https://github.com/gnosis/MultiSigWallet/blob/master/contracts/Factory.sol)) 
    
    - 기부 단체 회원 가입
        - MultiSigWalletFactory의 create 메서드를 통해 기부 단체 EOA 주소 + 관리자 EOA 주소를 기반으로 멀티시그 CA 생성
    - 기부금 수령
        - 멀티시그 CA에서 submitTransaction 메서드 실행(USDT를 기부단체 EOA로 transfer 하는 데이터 encode)
        - 관리자 signer가 생성된 txID에 대해 confirmTransaction 메서드 실행
        - 기부 단체, 관리자 signer의 confirm 확인 후 멀티시그 CA가 보유한 기부금을 기부 단체 EOA로 전송
        
- **NFT 발행**
    - NFT 정보 생성
        - 기부자가 기부한 토큰정보로 고유한 정보(기부제목, 기부일, 기부단체명, 기부내용, 기부금액, 이미지)를 생성 후 pinata api 를 사용해 IPFS형식으로 저장
    - NFT 발행
        - IPFS형식으로 저장된 정보를  ERC721을 사용해 NFT 발행
    
- **영수증 인증**
    - 영수증 사용 금액 확인
        - Naver Clova OCR API를 사용해 영수증 이미지에서 총 구매 금액, 구매 내역 정보 수집 및 JSON 형태로 데이터 가공
        - Pinata IPFS에 영수증 정보를 JSON metadata로 저장
        

### 개발기간 : 2024.07.20 ~ 2024.08.30 (총 4주)

<img width="456" alt="스크린샷 2024-09-12 오후 5 01 28" src="https://github.com/user-attachments/assets/2355cae2-3317-44db-8fa9-d94c33af8864">

### 역할 및 인원 : 총 4명

<img width="647" alt="스크린샷 2024-09-12 오후 4 51 53" src="https://github.com/user-attachments/assets/8d00b55b-3ee8-49bb-b13b-b3757d43784a">

### 서비스 소개 및 특장점

1. 투명성과 보상의 조화:
Gnosis 멀티시그 월렛을 통한 기부금 관리로 투명성을 보장하며, 동시에 기부자에게 고유한 NFT를 발행하여 기부 활동에 대한 특별한 보상과 기념을 제공합니다.

1. 혁신적인 비용 절감 메커니즘:
EIP-2612의 permit 기능을 활용한 서명 기반 기부 시스템과 일괄 처리 방식을 통해 개별 사용자의 가스비 부담을 크게 줄입니다. 이는 소액 기부의 장벽을 낮추고 더 많은 참여를 유도합니다.

1. 효율적인 마이크로 기부 시스템:
사용자 지갑의 소액 토큰을 쉽게 조회하고 기부할 수 있게 하여, 방치된 자산의 활용도를 높입니다. Coingecko API를 활용한 실시간 가격 정보와 캐싱 시스템으로 사용자에게 정확하고 빠른 정보를 제공합니다.

## 화면 기획서

### 기능 명세서

![image (1)](https://github.com/user-attachments/assets/a7f48300-061c-4e85-a6be-877f4919e55d)

![image (2)](https://github.com/user-attachments/assets/c5c00f48-8b09-467b-a975-e2e95b087da2)

![image (3)](https://github.com/user-attachments/assets/36ae711f-0718-45fc-a70d-ccac3fdd6f45)


## 화면 설명

### 기부단체

- 로그인후 기업 지갑 생성
    <br><img src="https://github.com/user-attachments/assets/8f1fd128-61aa-4f26-9c2a-0f6946126eb7" width='640'/>
    

- 프로젝트 등록
    <br><img src="https://github.com/user-attachments/assets/62f3632b-ccf0-4811-99cb-83e66b623f71" width='640'/>
    

- 프로젝트 현황 확인 및 기부금 수령
    <br><img src="https://github.com/user-attachments/assets/01bd484e-b429-4c36-b5af-6e7a7cfa9ce0" width='640'/>
    

### 기부자

- 토큰 잔액 및 프로젝트 확인
    <br><img src="https://github.com/user-attachments/assets/b5935eb5-7e7c-4c3d-9168-d944f3389346" width='640'/>
    

- 기부 토큰 선택 및 기부
    <br><img src="https://github.com/user-attachments/assets/b1231f76-c6e1-49e4-8eb2-efe3a434e090" width='640'/>
    

- 기부된 토큰 기반으로 NFT 생성
    <br><img src="https://github.com/user-attachments/assets/970beff8-2641-4ebd-be30-98184a772342" width='640'/>
