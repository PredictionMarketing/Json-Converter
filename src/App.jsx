import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Download, RotateCcw, CheckCircle, AlertCircle } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('text');
  const [textInput, setTextInput] = useState('');
  const [jsonOutput, setJsonOutput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fileName, setFileName] = useState('');
  const [auditLog, setAuditLog] = useState([]);
  const [stats, setStats] = useState({
    conversions: 0,
    filesProcessed: 0,
    errors: 0,
    totalCharacters: 0
  });
  
  const fileInputRef = useRef(null);
  const fileUploadRef = useRef(null);

  const addLogEntry = useCallback((message, type = 'info') => {
    const entry = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toLocaleString()
    };
    setAuditLog(prev => [entry, ...prev.slice(0, 49)]);
  }, []);

  const updateStats = useCallback((type, value = 1) => {
    setStats(prev => ({
      ...prev,
      [type]: prev[type] + value
    }));
  }, []);

  const convertToJSON = useCallback((text) => {
    if (!text.trim()) {
      setError('Please enter some text to convert');
      return false;
    }

    try {
      setError('');
      setSuccess('');
      
      let result;
      try {
        result = JSON.parse(text);
        addLogEntry('Input was already valid JSON, reformatted', 'info');
      } catch {
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          throw new Error('No content to convert');
        }

        if (lines.every(line => line.includes(':'))) {
          result = {};
          lines.forEach((line, index) => {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
              const key = line.substring(0, colonIndex).trim();
              const value = line.substring(colonIndex + 1).trim();
              
              let parsedValue = value;
              if (value.toLowerCase() === 'true') parsedValue = true;
              else if (value.toLowerCase() === 'false') parsedValue = false;
              else if (!isNaN(value) && value !== '') parsedValue = Number(value);
              
              result[key] = parsedValue;
            } else {
              result[`line_${index + 1}`] = line;
            }
          });
          addLogEntry('Converted key-value pairs to JSON object', 'success');
        } else {
          result = lines;
          addLogEntry('Converted text lines to JSON array', 'success');
        }
      }

      const formattedJSON = JSON.stringify(result, null, 2);
      setJsonOutput(formattedJSON);
      setSuccess('Successfully converted to JSON!');
      
      updateStats('conversions');
      updateStats('totalCharacters', text.length);
      addLogEntry(`Converted ${text.length} characters to JSON`, 'success');
      
      return true;
    } catch (err) {
      const errorMsg = `Conversion failed: ${err.message}`;
      setError(errorMsg);
      addLogEntry(errorMsg, 'error');
      updateStats('errors');
      return false;
    }
  }, [addLogEntry, updateStats]);

  const handleTextConvert = () => {
    convertToJSON(textInput);
  };

  const handleFileUpload = (file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      setFileName(file.name);
      if (convertToJSON(content)) {
        updateStats('filesProcessed');
        addLogEntry(`Successfully processed file: ${file.name}`, 'success');
      }
    };
    reader.onerror = () => {
      const errorMsg = 'Failed to read file';
      setError(errorMsg);
      addLogEntry(errorMsg, 'error');
      updateStats('errors');
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (fileUploadRef.current) {
      fileUploadRef.current.classList.add('dragover');
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (fileUploadRef.current) {
      fileUploadRef.current.classList.remove('dragover');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (fileUploadRef.current) {
      fileUploadRef.current.classList.remove('dragover');
    }
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const downloadJSON = () => {
    if (!jsonOutput) {
      setError('No JSON to download');
      return;
    }

    try {
      const blob = new Blob([jsonOutput], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName ? `${fileName.split('.')[0]}.json` : 'converted.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      addLogEntry('JSON file downloaded successfully', 'success');
      setSuccess('JSON file downloaded successfully!');
    } catch (err) {
      const errorMsg = 'Failed to download file';
      setError(errorMsg);
      addLogEntry(errorMsg, 'error');
    }
  };

  const clearAll = () => {
    setTextInput('');
    setJsonOutput('');
    setError('');
    setSuccess('');
    setFileName('');
    addLogEntry('Cleared all inputs and outputs', 'info');
  };

  const runSelfAudit = () => {
    const auditResults = [];
    
    if (jsonOutput) {
      try {
        JSON.parse(jsonOutput);
        auditResults.push('✓ Output is valid JSON');
      } catch {
        auditResults.push('✗ Output is not valid JSON');
      }
    }
    
    const totalOperations = stats.conversions + stats.errors;
    auditResults.push(`✓ Total operations: ${totalOperations}`);
    auditResults.push(`✓ Success rate: ${totalOperations > 0 ? ((stats.conversions / totalOperations) * 100).toFixed(1) : 0}%`);
    auditResults.push(`✓ Audit log entries: ${auditLog.length}`);
    
    const auditMessage = `Self-audit completed: ${auditResults.join(', ')}`;
    addLogEntry(auditMessage, 'info');
    setSuccess('Self-audit completed successfully!');
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Text to JSON Converter</h1>
        <p>Convert text files or manual input to structured JSON format with self-auditing capabilities</p>
      </div>

      <div className="main-content">
        <div className="input-section">
          <h2 className="section-title">Input</h2>
          
          <div className="input-tabs">
            <button 
              className={`tab-button ${activeTab === 'text' ? 'active' : ''}`}
              onClick={() => setActiveTab('text')}
            >
              <FileText size={16} />
              Text Input
            </button>
            <button 
              className={`tab-button ${activeTab === 'file' ? 'active' : ''}`}
              onClick={() => setActiveTab('file')}
            >
              <Upload size={16} />
              File Upload
            </button>
          </div>

          {activeTab === 'text' ? (
            <div>
              <textarea
                className="text-input"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Enter your text here... 
Examples:
- Key-value pairs (name: John, age: 30)
- Simple list of items
- Any structured text"
              />
              <div className="controls">
                <button className="btn btn-primary" onClick={handleTextConvert}>
                  Convert to JSON
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div 
                ref={fileUploadRef}
                className="file-upload"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
              >
                <Upload size={48} style={{ margin: '0 auto 10px', color: '#6b7280' }} />
                <p>Click to select a file or drag and drop</p>
                <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '5px' }}>
                  Supports .txt, .csv, .log and other text files
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="file-input"
                accept=".txt,.csv,.log,.json,text/*"
                onChange={handleFileInputChange}
              />
              {fileName && (
                <p style={{ marginTop: '10px', color: '#059669' }}>
                  <CheckCircle size={16} style={{ display: 'inline', marginRight: '5px' }} />
                  File loaded: {fileName}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="output-section">
          <h2 className="section-title">JSON Output</h2>
          <textarea
            className="output-area"
            value={jsonOutput}
            readOnly
            placeholder="Converted JSON will appear here..."
          />
          <div className="controls">
            <button 
              className="btn btn-success" 
              onClick={downloadJSON}
              disabled={!jsonOutput}
            >
              <Download size={16} />
              Download JSON
            </button>
            <button className="btn btn-secondary" onClick={clearAll}>
              <RotateCcw size={16} />
              Clear All
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="error">
          <AlertCircle size={16} style={{ display: 'inline', marginRight: '5px' }} />
          {error}
        </div>
      )}

      {success && (
        <div className="success">
          <CheckCircle size={16} style={{ display: 'inline', marginRight: '5px' }} />
          {success}
        </div>
      )}

      <div className="audit-section">
        <h2 className="section-title">Self-Auditing Dashboard</h2>
        
        <div className="audit-stats">
          <div className="stat-card">
            <div className="stat-value">{stats.conversions}</div>
            <div className="stat-label">Successful Conversions</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.filesProcessed}</div>
            <div className="stat-label">Files Processed</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.errors}</div>
            <div className="stat-label">Errors</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.totalCharacters.toLocaleString()}</div>
            <div className="stat-label">Characters Processed</div>
          </div>
        </div>

        <div className="controls">
          <button className="btn btn-primary" onClick={runSelfAudit}>
            <CheckCircle size={16} />
            Run Self-Audit
          </button>
        </div>

        <h3 style={{ marginTop: '20px', marginBottom: '10px' }}>Activity Log</h3>
        <div className="audit-log">
          {auditLog.length === 0 ? (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>
              No activity yet. Start converting text to see logs here.
            </p>
          ) : (
            auditLog.map(entry => (
              <div key={entry.id} className="log-entry">
                <div>{entry.message}</div>
                <div className="log-timestamp">{entry.timestamp}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
