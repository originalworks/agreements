// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '../interfaces/ILendingContract.sol';

contract LendingContract is
    OwnableUpgradeable,
    ILendingContract,
    UUPSUpgradeable,
    ERC165Upgradeable
{
    using SafeERC20Upgradeable for IERC20Upgradeable;

    IERC20Upgradeable public trackedToken;
    uint256 private interestDecimal;
    uint256 private lastLoanId;
    mapping(address => bool) public whitelist;
    mapping(uint256 => Loan) public loans;
    mapping(address => mapping(address => uint256)) private _agreementLoans;

    event AddedToWhitelist(address account);
    event RemovedFromWhitelist(address account);
    event LoanCreated(
        uint256 id,
        address[] agreements,
        address lender,
        address borrower
    );
    event Repayment(uint256 id, uint256 amount);
    event LoanIncreased(uint256 id, uint256 amount);

    struct Loan {
        address lender;
        address borrower;
        uint256 amountLeft; // pure loan amount without interest
        uint256 accumulatedInterestLeft; // stores earlier accumulated interest when loan recalculations happen
        uint256 interestRate; // (percent per day / 100) in "wei"
        uint256 interestPayed;
        uint256 lastRecalculationDate;
    }

    modifier onlyWhitelisted() {
        require(
            isWhitelisted(msg.sender),
            'LendingContract: Sender must be whitelisted'
        );
        _;
    }

    function initialize(address _trackedToken) public initializer {
        interestDecimal = 10 ** 18;
        lastLoanId = 0;
        trackedToken = IERC20Upgradeable(_trackedToken);
        __Ownable_init();
    }

    function addToWhitelist(address _address) public onlyOwner {
        whitelist[_address] = true;
        emit AddedToWhitelist(_address);
    }

    function removeFromWhitelist(address _address) public onlyOwner {
        whitelist[_address] = false;
        emit RemovedFromWhitelist(_address);
    }

    function approveLoan(
        address[] memory agreements,
        address borrower,
        address lender,
        uint256 amount,
        uint256 interestRate
    ) public onlyWhitelisted {
        require(
            msg.sender == lender,
            'LendingContract: Only lender can approve'
        );
        require(
            borrower != address(0),
            'LendingContract: Transfer to the zero address'
        );
        require(amount > 0, 'LendingContract: Amount is zero');
        require(interestRate > 0, 'LendingContract: Interest rate is zero');
        require(
            interestRate < interestDecimal,
            'LendingContract: Interest rate is too high'
        ); // 100% per day is too big
        require(agreements.length > 0, 'LendingContract: No agreements');
        for (uint256 i = 0; i < agreements.length; i++) {
            require(
                agreements[i] != address(0),
                'LendingContract: Invalid agreement address'
            );
            // cannot be used as collateral until debt is repaid
            require(
                !isCollateral(borrower, agreements[i]),
                'LendingContract: Repay first'
            );
        }
        lastLoanId++;
        // initially applied interest for 1 day to prevent from free repay on the first day
        uint256 initialInterest = (amount * interestRate) / interestDecimal;
        loans[lastLoanId] = Loan(
            lender,
            borrower,
            amount,
            initialInterest,
            interestRate,
            0,
            block.timestamp
        );

        for (uint256 i = 0; i < agreements.length; i++) {
            _agreementLoans[borrower][agreements[i]] = lastLoanId;
        }
        trackedToken.safeTransferFrom(msg.sender, borrower, amount);
        emit LoanCreated(lastLoanId, agreements, lender, borrower);
    }

    function approveIncreaseLoan(
        uint256 loanId,
        uint256 amount
    ) public onlyWhitelisted {
        require(
            msg.sender == loans[loanId].lender,
            'LendingContract: Only lender can approve'
        );
        require(
            loans[loanId].borrower != address(0),
            'LendingContract: Loan does not exists'
        );

        uint256 accumulatedInterest;
        (, , accumulatedInterest) = getOutstandingDebt(loanId);

        trackedToken.safeTransferFrom(
            msg.sender,
            loans[loanId].borrower,
            amount
        );
        loans[loanId].amountLeft = loans[loanId].amountLeft + amount;
        loans[loanId].accumulatedInterestLeft = accumulatedInterest;
        loans[loanId].lastRecalculationDate = block.timestamp;

        emit LoanIncreased(loanId, amount);
    }

    function transfer(address agreement, address to, uint256 amount) public {
        uint256 loanId = _agreementLoans[to][agreement];
        uint256 debt;
        (debt, , ) = getOutstandingDebt(loanId);

        if (debt == 0) {
            trackedToken.safeTransferFrom(msg.sender, to, amount);
            return;
        }

        if (amount > debt) {
            trackedToken.safeTransferFrom(msg.sender, to, (amount - debt));
            repay(loanId, debt);
        } else {
            repay(loanId, amount);
        }
    }

    function repay(uint256 loanId, uint256 repayment) public {
        require(
            loans[loanId].borrower != address(0),
            'LendingContract: Loan does not exist'
        );
        uint256 debtSum;
        uint256 interest;
        (debtSum, , interest) = getOutstandingDebt(loanId);

        if (repayment > debtSum) {
            _safeRepayment(loanId, debtSum, interest);
        } else {
            _safeRepayment(loanId, repayment, interest);
        }
    }

    function isWhitelisted(address _address) public view returns (bool) {
        return whitelist[_address];
    }

    function getOutstandingDebt(
        uint256 loanId
    )
        public
        view
        returns (uint256 debtSum, uint256 debt, uint256 interestAmount)
    {
        if (loanId == 0) {
            return (0, 0, 0);
        }
        Loan memory loan = loans[loanId];
        uint256 daysSinceLastRecalculation = (block.timestamp -
            loan.lastRecalculationDate) / 1 days;
        uint256 interest = ((loan.amountLeft *
            loan.interestRate *
            daysSinceLastRecalculation) / interestDecimal) +
            loan.accumulatedInterestLeft;
        return ((loan.amountLeft + interest), loan.amountLeft, interest);
    }

    function isCollateral(
        address borrower,
        address agreement
    ) public view returns (bool) {
        uint256 loanId = _agreementLoans[borrower][agreement];
        uint256 debt;
        (debt, , ) = getOutstandingDebt(loanId);

        return debt != 0;
    }

    function _safeRepayment(
        uint256 loanId,
        uint256 repayment,
        uint256 interest
    ) private {
        trackedToken.safeTransferFrom(
            msg.sender,
            loans[loanId].lender,
            repayment
        );

        if (repayment <= interest) {
            loans[loanId].accumulatedInterestLeft = interest - repayment;
            loans[loanId].interestPayed += repayment;
        } else {
            loans[loanId].accumulatedInterestLeft = 0;
            loans[loanId].amountLeft -= (repayment - interest);
            loans[loanId].interestPayed += interest;
        }

        if (loans[loanId].amountLeft == 0) {
            delete loans[loanId];
        } else {
            loans[loanId].lastRecalculationDate = block.timestamp;
        }

        emit Repayment(loanId, repayment);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC165Upgradeable) returns (bool) {
        return
            interfaceId == type(ILendingContract).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
