import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { usersAPI } from '../services/api';
import toast from 'react-hot-toast';

interface KYCDocument {
  documentType: 'aadhar' | 'pan' | 'driving_license' | 'passport' | 'other';
  documentNumber: string;
  documentUrl: string;
  documentFile?: File;
}

const KYCVerification: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [documents, setDocuments] = useState<KYCDocument[]>([
    { documentType: 'aadhar', documentNumber: '', documentUrl: '', documentFile: undefined },
    { documentType: 'pan', documentNumber: '', documentUrl: '', documentFile: undefined },
  ]);
  
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});

  const handleDocumentChange = (index: number, field: keyof KYCDocument, value: string | File) => {
    const updatedDocs = [...documents];
    if (field === 'documentFile') {
      updatedDocs[index][field] = value as File;
      updatedDocs[index].documentUrl = ''; // Clear previous URL if new file selected
    } else if (field === 'documentType') {
      updatedDocs[index][field] = value as 'aadhar' | 'pan' | 'driving_license' | 'passport' | 'other';
    } else {
      updatedDocs[index][field] = value as string;
    }
    setDocuments(updatedDocs);
  };

  const handleFileUpload = async (index: number, file: File) => {
    if (!file) return;

    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentType', documents[index].documentType);

    try {
      setUploadProgress(prev => ({ ...prev, [index]: 0 }));

      const result = await usersAPI.uploadKYCDocument(formData);
      
      // Update document with uploaded file URL
      handleDocumentChange(index, 'documentUrl', result.documentUrl);
      setUploadProgress(prev => ({ ...prev, [index]: 100 }));
      
      toast.success(`${documents[index].documentType.toUpperCase()} document uploaded successfully`);
    } catch (error: any) {
      toast.error(`Failed to upload ${documents[index].documentType} document: ${error.message || 'Upload failed'}`);
      setUploadProgress(prev => ({ ...prev, [index]: 0 }));
    }
  };

  const addDocument = () => {
    setDocuments([
      ...documents,
      { documentType: 'driving_license', documentNumber: '', documentUrl: '', documentFile: undefined }
    ]);
  };

  const removeDocument = (index: number) => {
    if (documents.length > 1) {
      setDocuments(documents.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate all documents have required fields
      const invalidDocs = documents.filter(doc => 
        !doc.documentNumber || !doc.documentUrl
      );

      if (invalidDocs.length > 0) {
        toast.error('Please complete all document fields and upload files');
        return;
      }

      // Check for duplicate documents
      const duplicateNumbers = documents
        .map(doc => doc.documentNumber)
        .filter((number, index, arr) => arr.indexOf(number) !== index);

      if (duplicateNumbers.length > 0) {
        toast.error('Duplicate document numbers found. Please use unique document numbers.');
        return;
      }

      // Submit KYC documents using the API service
      const result = await usersAPI.uploadKYCDocuments({
        documents: documents.map(doc => ({
          documentType: doc.documentType,
          documentNumber: doc.documentNumber,
          documentUrl: doc.documentUrl
        }))
      });

      toast.success('KYC documents submitted successfully! Your account is now under review.');
      
      // Redirect to provider dashboard
      navigate('/provider');
      
    } catch (error: any) {
      toast.error(error.message || 'KYC submission failed');
    } finally {
      setLoading(false);
    }
  };

  const documentTypes = [
    { value: 'aadhar', label: 'Aadhar Card' },
    { value: 'pan', label: 'PAN Card' },
    { value: 'driving_license', label: 'Driving License' },
    { value: 'passport', label: 'Passport' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">KYC Verification</h1>
            <p className="text-gray-600">
              Complete your KYC verification to start offering services. Please upload valid government-issued documents.
            </p>
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> All documents must be clear, valid, and not expired. 
                Duplicate document numbers will be rejected.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {documents.map((doc, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Document {index + 1}</h3>
                  {documents.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDocument(index)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Document Type
                    </label>
                    <select
                      value={doc.documentType}
                      onChange={(e) => handleDocumentChange(index, 'documentType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    >
                      {documentTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Document Number
                    </label>
                    <input
                      type="text"
                      value={doc.documentNumber}
                      onChange={(e) => handleDocumentChange(index, 'documentNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter document number"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Upload Document
                  </label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleDocumentChange(index, 'documentFile', file);
                          handleFileUpload(index, file);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required={!doc.documentUrl}
                    />
                    
                    {uploadProgress[index] !== undefined && uploadProgress[index] > 0 && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress[index]}%` }}
                        ></div>
                      </div>
                    )}
                    
                    {doc.documentUrl && (
                      <div className="flex items-center space-x-2 text-green-600">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm">Document uploaded successfully</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div className="flex justify-between">
              <button
                type="button"
                onClick={addDocument}
                className="btn btn-outline"
              >
                + Add Another Document
              </button>

              <div className="space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/provider')}
                  className="btn btn-outline"
                >
                  Skip for Now
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Submitting...' : 'Submit KYC Documents'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default KYCVerification;
