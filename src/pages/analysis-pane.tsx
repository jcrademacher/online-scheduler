import { AnalysisResult } from "../analyzer";
import { Button, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronUp, faChevronDown, faCircleInfo, faCircleXmark, faEraser, faScrewdriverWrench, faTriangleExclamation, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useEffect, useState } from "react";

interface AnalysisPaneProps {
    paneOpen: boolean;
    analysis: AnalysisResult | null;
    onClose: () => void;
    onRunAnalysis: () => void;
    analysisLoading: boolean;
    onClearAnalysis: () => void;
}

export function AnalysisPane({ paneOpen, analysis, onClose, onRunAnalysis, analysisLoading, onClearAnalysis }: AnalysisPaneProps) {
    // if (!analysis) return null;

    let infoItems: string[] = analysis?.infoMessages || [];
    let warningItems: string[] = analysis?.warningMessages || [];
    let errorItems: string[] = analysis?.errorMessages || [];

    const [infoExpanded, setInfoExpanded] = useState(false);
    const [warningExpanded, setWarningExpanded] = useState(false);
    const [errorExpanded, setErrorExpanded] = useState(false);

    useEffect(() => {
        if (analysis) {
            setInfoExpanded(true);
            setWarningExpanded(true);
            setErrorExpanded(true);
        }
        else {
            setInfoExpanded(false);
            setWarningExpanded(false);
            setErrorExpanded(false);
        }
    }, [analysis]);

    return (
        <div className={`analysis-pane ${paneOpen ? '' : 'hidden'}`}>
            <div className="analysis-pane-header">
                <div>
                    <h3>Analysis</h3>
                </div>
                
                <div className="analysis-actions">
                    <Button 
                        variant="light" 
                        size="sm" 
                        title="Run Analysis"
                        onClick={onRunAnalysis}
                        disabled={analysisLoading}
                    >
                        {analysisLoading ? <Spinner animation="border" size="sm" /> : <FontAwesomeIcon style={{ marginRight: "5px" }} icon={faScrewdriverWrench} />}
                        Run
                    </Button> 
                    <Button 
                        variant="light" 
                        size="sm" 
                        title="Clear Analysis"
                        onClick={onClearAnalysis}
                    >
                        <FontAwesomeIcon style={{ marginRight: "5px" }} icon={faEraser} />
                        Clear
                    </Button>
                    <Button 
                        className="close-btn" 
                        variant="light" 
                        size="sm" 
                        title="Close Analysis Pane"
                        onClick={onClose}
                    >
                        <FontAwesomeIcon icon={faXmark} />
                    </Button>
                </div>
            </div>

            <div className="analysis-pane-content">
                <AnalysisSection 
                    items={infoItems} 
                    expanded={infoExpanded}
                    onToggle={() => setInfoExpanded((a: boolean) => !a)}
                >
                 
                        <FontAwesomeIcon style={{ marginRight: "5px" }} className='analysis-count' color="green" icon={faCircleInfo} />
                        <strong>Information ({infoItems.length})</strong>
             
                </AnalysisSection>
                <AnalysisSection 
                    items={warningItems}
                    expanded={warningExpanded}
                    onToggle={() => setWarningExpanded((a: boolean) => !a)}
                >
                  
                        <FontAwesomeIcon style={{ marginRight: "5px" }} className='analysis-count' color="#dbb402" icon={faTriangleExclamation} />
                        <strong>Warnings ({warningItems.length})</strong>
            
                </AnalysisSection>
                <AnalysisSection 
                    items={errorItems}
                    expanded={errorExpanded}
                    onToggle={() => setErrorExpanded((a: boolean) => !a)}
                >
                  
                        <FontAwesomeIcon style={{ marginRight: "5px" }} className='analysis-count' color="red" icon={faCircleXmark} />
                        <strong>Errors ({errorItems.length})</strong>
               
                </AnalysisSection>
            </div>
        </div>
    );
}

function AnalysisSection({ items, expanded, children, onToggle }: { items: string[], expanded: boolean, children: React.ReactNode, onToggle: () => void }) {
    return (
        <div className="analysis-section">
            <div className="analysis-section-header" onClick={onToggle}>
                {children}
                <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} />
            </div>
            <div className={`analysis-section-content  ${expanded ? 'show' : ''}`}> 

                    <div className={`inner`}>
                        
                        <ul>
                            {items.map((item, i) => (
                                <li key={i}>{item}</li>
                            ))}
                        </ul>
                    </div>
                    
                
            </div>
        </div>
    );
}