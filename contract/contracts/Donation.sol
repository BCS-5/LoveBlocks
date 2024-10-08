// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.2 <0.9.0;

import "@openzeppelin/contracts/utils/Strings.sol";
import "./DonationSwap.sol";

interface IERC20Permit {
    /* 서명 permit interface*/

    function permit(
        address owner, //토큰소유자
        address spender, //승인할계정
        uint256 value, //토큰량
        uint256 deadline, //서명유효기간
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function nonces(address owner) external view returns (uint256); //서명자 논스값(중복방지)
}

// interface IERC20 {
//     function transferFrom(
//         address from,
//         address to,
//         uint256 amount
//     ) external returns (bool);
//     function balanceOf(address account) external view returns (uint256);
// }

contract Donation is TokenSwap {
    /* 기부 서명 받을때 데이터 */
    struct SignatureData {
        address owner; //토큰소유자
        address token; //토큰주소
        uint256 amount; //토큰량
        uint256 deadline; //서명유효기간
        /* v,r,s 는 서명값임 */
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    /* permit 완료 후 DB에 저장했던 transferFrom 전용 데이터 */
    struct DBSignatureData {
        address tokenAddress;
        uint256 amount;
        address owner;
    }

    /* 기부단체가 기부프로젝트 신청시 정보 저장(기부단체 => pinata에 저장된 CID)*/
    // mapping(address => string) applyDonationPJInfoList;
    struct Organization {
        address orgAddr;
        string cid;
    }

    struct CollectToken {
        address tokenAddr;
        uint amount;
    }

    CollectToken[] collectTokens;
    Organization[] projectList;
    Organization selectedCharity;
    mapping(address => string[]) receipts;
    uint public totalDonation;
    uint public usedDonation;

    //서명 받은거 permit처리 (approve)
    function permit(SignatureData calldata signature) external {
        IERC20Permit tokenPermit = IERC20Permit(signature.token);

        tokenPermit.permit(
            signature.owner,
            address(this),
            signature.amount,
            signature.deadline,
            signature.v,
            signature.r,
            signature.s
        );
    }

    function transferFrom(DBSignatureData[] memory signature) external {
        require(signature.length > 0, "no signature data.");

        for (uint i = 0; i < signature.length; i++) {
            IERC20 token = IERC20(signature[i].tokenAddress);

            bool flag = false;

            for (uint j = 0; j < collectTokens.length; j++) {
                if (collectTokens[j].tokenAddr == signature[i].tokenAddress) {
                    collectTokens[j].amount += signature[i].amount;
                    flag = true;
                    break;
                }
            }
            if (!flag) {
                collectTokens.push(
                    CollectToken({
                        tokenAddr: signature[i].tokenAddress,
                        amount: signature[i].amount
                    })
                );
            }

            require(
                token.transferFrom(
                    signature[i].owner,
                    address(this),
                    signature[i].amount
                ),
                "Transfer failed"
            );
        }
    }

    function getCollectToken() public view returns (CollectToken[] memory) {
        return collectTokens;
    }

    function swapUSDT() public {
        for (uint i = 0; i < collectTokens.length; i++) {
            swapExactTokensForUSDT(
                collectTokens[i].tokenAddr,
                collectTokens[i].amount,
                0x0293E2Ebd6a497E4b0825F3cef8057d78fE8e69e
            );
        }
    }

    //받은 토큰 조회
    function getContractTokenBalance(
        address token
    ) public view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // 소유자의 논스 값을 조회
    function getNonces(
        address token,
        address owner
    ) public view returns (uint256) {
        return IERC20Permit(token).nonces(owner);
    }

    //기부단체 신청정보 저장
    function setApplyDonationPJInfo(
        address organization,
        string memory cid
    ) public {
        // applyDonationPJInfoList[organization] = cid;
        for (uint i = 0; i < projectList.length; i++) {
            if (projectList[i].orgAddr == organization)
                revert("Already set information");
        }
        projectList.push(Organization({orgAddr: organization, cid: cid}));
    }

    //기부단체 신청정보 조회 (화면에서 CID로 처리)
    function getApplyDonationPJInfo(
        address organization
    ) public view returns (string memory) {
        for (uint i = 0; i < projectList.length; i++) {
            if (projectList[i].orgAddr == organization) {
                return projectList[i].cid;
            }
        }
        return "";
    }

    function getProjectList() public view returns (Organization[] memory) {
        return projectList;
    }

    function removeProject() public {
        delete selectedCharity;
        delete projectList;
    }

    function setSelectOrganization(Organization memory organization) public {
        selectedCharity = organization;
    }

    function selectRandomCharity() public {
        require(projectList.length > 0, "No charities registered");

        uint256 randomIndex = uint256(
            keccak256(
                abi.encodePacked(block.timestamp, block.difficulty, msg.sender)
            )
        ) % projectList.length;
        selectedCharity = projectList[randomIndex];
    }

    function getSelectedCharity() public view returns (Organization memory) {
        return selectedCharity;
    }

    function setReceipts(string[] memory _receipts, uint _totalPrice) public {
        uint len = receipts[msg.sender].length;
        uint inputLen = _receipts.length;
        string[] memory temp = new string[](len + inputLen);
        for (uint i = 0; i < len; i++) {
            temp[i] = receipts[msg.sender][i];
        }
        for (uint i = len; i < len + inputLen; i++) {
            temp[i] = _receipts[i - len];
        }
        delete receipts[msg.sender];
        receipts[msg.sender] = temp;
        usedDonation += _totalPrice;
    }

    function getReceipts(address _addr) public view returns (string[] memory) {
        return receipts[_addr];
    }
}
