const pd_api = require('pandadoc-node-client');
const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const { v4: uuidv4 } = require('uuid');

class ContractService {
  constructor() {
    // Initialize PandaDoc only if API key is available
    if (process.env.PANDADOC_API_KEY) {
      this.configuration = pd_api.createConfiguration({
        authMethods: { 
          apiKey: `API-Key ${process.env.PANDADOC_API_KEY}` 
        },
        baseServer: new pd_api.ServerConfiguration(
          process.env.NODE_ENV === 'production' 
            ? "https://api.pandadoc.com" 
            : "https://api.pandadoc.com", // Use production API for now, sandbox if needed
          {}
        )
      });
      
      this.documentsApi = new pd_api.DocumentsApi(this.configuration);
      this.templatesApi = new pd_api.TemplatesApi(this.configuration);
      this.isConfigured = true;
    } else {
      console.warn('PandaDoc API key not configured. Contract functionality will be limited.');
      this.documentsApi = null;
      this.templatesApi = null;
      this.isConfigured = false;
    }
  }

  // Generate contract PDF from template
  async generateContractPDF(contractData) {
    try {
      const {
        campaignTitle,
        brandName,
        creatorName,
        creatorEmail,
        budget,
        deliverables,
        timeline,
        paymentTerms,
        additionalTerms
      } = contractData;

      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();

      // Define fonts and colors
      const fontSize = 12;
      const titleFontSize = 16;
      const textColor = rgb(0, 0, 0);

      // Contract content
      const contractContent = `
INFLUENCER MARKETING AGREEMENT

Campaign: ${campaignTitle}
Date: ${new Date().toLocaleDateString()}

PARTIES:
Brand: ${brandName}
Influencer: ${creatorName} (${creatorEmail})

TERMS AND CONDITIONS:

1. CAMPAIGN DETAILS
   Budget: $${budget}
   Timeline: ${timeline}
   
2. DELIVERABLES
   ${deliverables}

3. PAYMENT TERMS
   ${paymentTerms}

4. ADDITIONAL TERMS
   ${additionalTerms || 'Standard terms and conditions apply.'}

5. PERFORMANCE METRICS
   - Content must meet brand guidelines
   - Deliverables must be submitted by agreed dates
   - Payment contingent on satisfactory completion

6. INTELLECTUAL PROPERTY
   - Creator retains ownership of original content
   - Brand receives license for campaign usage
   - Both parties may use content for portfolio purposes

7. TERMINATION
   Either party may terminate with 48-hour notice
   Completed work will be compensated pro-rata

By signing below, both parties agree to these terms.

Signatures:
Brand Representative: _______________________ Date: _______
Influencer: ______________________________ Date: _______
`;

      // Add content to PDF
      const lines = contractContent.split('\n');
      let yPosition = height - 50;

      lines.forEach((line, index) => {
        const currentFontSize = line.includes('INFLUENCER MARKETING AGREEMENT') ? titleFontSize : fontSize;
        
        page.drawText(line, {
          x: 50,
          y: yPosition,
          size: currentFontSize,
          color: textColor,
        });
        
        yPosition -= currentFontSize + 5;
        
        // Add new page if needed
        if (yPosition < 50 && index < lines.length - 1) {
          const newPage = pdfDoc.addPage();
          yPosition = newPage.getSize().height - 50;
        }
      });

      const pdfBytes = await pdfDoc.save();
      
      // Save to temp file
      const fileName = `contract_${uuidv4()}.pdf`;
      const filePath = path.join(__dirname, '../../temp', fileName);
      
      // Ensure temp directory exists
      const tempDir = path.dirname(filePath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, pdfBytes);
      
      return {
        fileName,
        filePath,
        pdfBytes
      };
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error('Failed to generate contract PDF');
    }
  }

  // Create PandaDoc document from PDF buffer
  async createPandaDocDocument(contractData, pdfData) {
    try {
      if (!this.isConfigured) {
        throw new Error('PandaDoc is not configured. Please set PANDADOC_API_KEY environment variable.');
      }

      // Create document from PDF file/buffer
      const documentCreateRequest = {
        name: `Contract for ${contractData.campaignTitle}`,
        file: fs.createReadStream(pdfData.filePath),
        recipients: [
          {
            email: process.env.BRAND_EMAIL || 'brand@company.com',
            firstName: contractData.brandName?.split(' ')[0] || 'Brand',
            lastName: contractData.brandName?.split(' ').slice(1).join(' ') || 'Representative',
            role: 'Brand',
            signingOrder: 1
          },
          {
            email: contractData.creatorEmail,
            firstName: contractData.creatorName?.split(' ')[0] || 'Creator',
            lastName: contractData.creatorName?.split(' ').slice(1).join(' ') || '',
            role: 'Influencer',
            signingOrder: 2
          }
        ],
        fields: {
          campaign_title: { value: contractData.campaignTitle },
          budget: { value: contractData.budget?.toString() },
          timeline: { value: contractData.timeline },
          deliverables: { value: contractData.deliverables }
        },
        metadata: {
          campaign_id: contractData.campaignId || 'unknown',
          contract_type: 'influencer_marketing'
        },
        parseFormFields: false
      };

      const response = await this.documentsApi.createDocument({
        documentCreateRequest
      });

      // Clean up temp file
      if (fs.existsSync(pdfData.filePath)) {
        fs.unlinkSync(pdfData.filePath);
      }

      return {
        documentId: response.id,
        status: response.status,
        shareLink: response.links?.find(link => link.rel === 'document')?.href
      };
    } catch (error) {
      console.error('PandaDoc document creation error:', error);
      throw new Error(`Failed to create PandaDoc document: ${error.message}`);
    }
  }

  // Send document for signature
  async sendDocumentForSignature(documentId) {
    try {
      const response = await this.documentsApi.sendDocument({
        id: documentId,
        documentSendRequest: {
          message: 'Please review and sign this influencer marketing contract.',
          subject: 'Contract Ready for Signature',
          silent: false
        }
      });

      return {
        status: 'sent',
        message: 'Document sent successfully for signature'
      };
    } catch (error) {
      console.error('Document send error:', error);
      throw new Error(`Failed to send document: ${error.message}`);
    }
  }

  // Check document status
  async checkDocumentStatus(documentId) {
    try {
      const response = await this.documentsApi.statusDocument({
        id: documentId
      });

      return {
        documentId,
        status: response.status,
        statusDetails: response
      };
    } catch (error) {
      console.error('Document status check error:', error);
      throw new Error(`Failed to check document status: ${error.message}`);
    }
  }

  // Get signed document
  async getSignedDocument(documentId) {
    try {
      const response = await this.documentsApi.downloadDocument({
        id: documentId
      });

      return {
        documentId,
        downloadUrl: response,
        message: 'Document downloaded successfully'
      };
    } catch (error) {
      console.error('Document download error:', error);
      throw new Error(`Failed to download document: ${error.message}`);
    }
  }

  // Main method to generate and send contract
  async generateAndSendContract(campaignData, negotiationResult) {
    try {
      const contractData = {
        campaignTitle: campaignData.name || campaignData.title,
        brandName: campaignData.brandName || 'InfluencerFlow',
        creatorName: negotiationResult.creatorName,
        creatorEmail: negotiationResult.creatorEmail,
        budget: negotiationResult.finalBudget || campaignData.budget,
        deliverables: this.formatDeliverables(negotiationResult.deliverables || campaignData.deliverables),
        timeline: negotiationResult.timeline || `${campaignData.startDate} to ${campaignData.endDate}`,
        paymentTerms: negotiationResult.paymentTerms || 'Payment upon completion of deliverables',
        additionalTerms: negotiationResult.additionalTerms,
        campaignId: campaignData.id
      };

      // Generate PDF
      console.log('Generating contract PDF...');
      const pdfData = await this.generateContractPDF(contractData);

      // Create PandaDoc document
      console.log('Creating PandaDoc document...');
      const documentResult = await this.createPandaDocDocument(contractData, pdfData);

      // Wait for document to be ready (polling approach)
      console.log('Waiting for document to be ready...');
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        const statusCheck = await this.checkDocumentStatus(documentResult.documentId);
        
        if (statusCheck.status === 'document.draft') {
          break;
        }
        
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error('Document processing timeout');
        }
      }

      // Send for signature
      console.log('Sending document for signature...');
      await this.sendDocumentForSignature(documentResult.documentId);

      return {
        contractId: uuidv4(),
        documentId: documentResult.documentId,
        status: 'sent_for_signature',
        contractData,
        sentAt: new Date().toISOString(),
        shareLink: documentResult.shareLink
      };
    } catch (error) {
      console.error('Contract generation and send error:', error);
      throw new Error(`Failed to generate and send contract: ${error.message}`);
    }
  }

  // Helper method to format deliverables
  formatDeliverables(deliverables) {
    if (Array.isArray(deliverables)) {
      return deliverables.map(d => `${d.quantity || 1}x ${d.type || d.name || d}`).join(', ');
    }
    return deliverables || 'As per campaign requirements';
  }

  // Handle signature webhook (placeholder - PandaDoc webhooks)
  async handleSignatureWebhook(webhookData) {
    try {
      const { event, data } = webhookData;
      
      if (event === 'document_state_changed' && data.status === 'document.completed') {
        return {
          status: 'completed',
          documentId: data.id,
          completedAt: new Date().toISOString(),
          signedDocumentPath: `signed_contracts/${data.id}.pdf`
        };
      }

      return {
        status: 'processed',
        documentId: data?.id || 'unknown',
        event
      };
    } catch (error) {
      console.error('Webhook processing error:', error);
      throw new Error('Failed to process signature webhook');
    }
  }

  // Create contract from template (if using PandaDoc templates)
  async createFromTemplate(templateId, contractData) {
    try {
      const documentCreateRequest = {
        name: `Contract for ${contractData.campaignTitle}`,
        templateUuid: templateId,
        recipients: [
          {
            email: process.env.BRAND_EMAIL || 'brand@company.com',
            firstName: contractData.brandName?.split(' ')[0] || 'Brand',
            lastName: contractData.brandName?.split(' ').slice(1).join(' ') || 'Representative',
            role: 'Brand'
          },
          {
            email: contractData.creatorEmail,
            firstName: contractData.creatorName?.split(' ')[0] || 'Creator',
            lastName: contractData.creatorName?.split(' ').slice(1).join(' ') || '',
            role: 'Influencer'
          }
        ],
        tokens: [
          { name: 'campaign.title', value: contractData.campaignTitle },
          { name: 'campaign.budget', value: contractData.budget?.toString() },
          { name: 'campaign.timeline', value: contractData.timeline },
          { name: 'creator.name', value: contractData.creatorName },
          { name: 'creator.email', value: contractData.creatorEmail }
        ],
        fields: {
          campaign_title: { value: contractData.campaignTitle },
          budget: { value: contractData.budget?.toString() },
          timeline: { value: contractData.timeline }
        }
      };

      const response = await this.documentsApi.createDocument({
        documentCreateRequest
      });

      return {
        documentId: response.id,
        status: response.status,
        contractData
      };
    } catch (error) {
      console.error('Template contract creation error:', error);
      throw new Error(`Failed to create contract from template: ${error.message}`);
    }
  }

  // Get contract template (basic template structure)
  getContractTemplate(campaignType = 'standard') {
    const templates = {
      standard: {
        title: 'Standard Influencer Marketing Agreement',
        sections: [
          'Campaign Details',
          'Deliverables and Timeline',
          'Compensation and Payment Terms',
          'Content Guidelines and Approval',
          'Intellectual Property Rights',
          'Performance Metrics and KPIs',
          'Termination Clauses',
          'Legal and Compliance'
        ]
      },
      premium: {
        title: 'Premium Influencer Partnership Agreement',
        sections: [
          'Campaign Overview and Objectives',
          'Detailed Deliverables Matrix',
          'Tiered Compensation Structure',
          'Exclusive Partnership Terms',
          'Advanced Content Guidelines',
          'Performance Bonuses and Incentives',
          'Extended Usage Rights',
          'Confidentiality and Non-Disclosure'
        ]
      }
    };

    return templates[campaignType] || templates.standard;
  }

  // List available templates
  async listTemplates() {
    try {
      const response = await this.templatesApi.listTemplates({
        deleted: false,
        tag: ['influencer-marketing', 'contract']
      });

      return {
        templates: response.results || [],
        count: response.count || 0
      };
    } catch (error) {
      console.error('Template listing error:', error);
      return {
        templates: [],
        count: 0,
        error: error.message
      };
    }
  }
}

module.exports = new ContractService(); 