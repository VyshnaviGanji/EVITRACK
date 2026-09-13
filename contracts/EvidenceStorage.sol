// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title EvidenceStorage
 * @dev Store evidence hashes on blockchain for tamper-proof verification
 * Deployed on Polygon Mumbai Testnet (FREE!)
 */
contract EvidenceStorage {
    
    struct Evidence {
        string hash;           // SHA-256 hash of the evidence file
        string caseId;         // Case reference number
        uint256 timestamp;     // When evidence was stored
        address uploadedBy;    // Who uploaded it
        bool exists;           // Whether evidence exists
    }
    
    // Mapping from evidenceId to Evidence
    mapping(string => Evidence) private evidenceRecords;
    
    // Event emitted when evidence is stored
    event EvidenceStored(
        string indexed evidenceId,
        string hash,
        string caseId,
        uint256 timestamp,
        address uploadedBy
    );
    
    /**
     * @dev Store evidence hash on blockchain
     * @param _evidenceId Unique identifier for the evidence
     * @param _hash SHA-256 hash of the evidence file
     * @param _caseId Case reference number
     */
    function storeEvidence(
        string memory _evidenceId,
        string memory _hash,
        string memory _caseId
    ) public {
        require(bytes(_evidenceId).length > 0, "Evidence ID cannot be empty");
        require(bytes(_hash).length == 64, "Invalid hash length");
        require(!evidenceRecords[_evidenceId].exists, "Evidence already exists");
        
        evidenceRecords[_evidenceId] = Evidence({
            hash: _hash,
            caseId: _caseId,
            timestamp: block.timestamp,
            uploadedBy: msg.sender,
            exists: true
        });
        
        emit EvidenceStored(_evidenceId, _hash, _caseId, block.timestamp, msg.sender);
    }
    
    /**
     * @dev Get evidence details from blockchain
     * @param _evidenceId Unique identifier for the evidence
     * @return hash The SHA-256 hash
     * @return caseId The case reference
     * @return timestamp When it was stored
     * @return exists Whether it exists
     */
    function getEvidence(string memory _evidenceId) 
        public 
        view 
        returns (
            string memory hash,
            string memory caseId,
            uint256 timestamp,
            bool exists
        ) 
    {
        Evidence memory evidence = evidenceRecords[_evidenceId];
        return (
            evidence.hash,
            evidence.caseId,
            evidence.timestamp,
            evidence.exists
        );
    }
    
    /**
     * @dev Check if evidence exists
     * @param _evidenceId Unique identifier for the evidence
     * @return bool Whether evidence exists
     */
    function evidenceExists(string memory _evidenceId) public view returns (bool) {
        return evidenceRecords[_evidenceId].exists;
    }
}
