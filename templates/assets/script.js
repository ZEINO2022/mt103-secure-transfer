/**
 * MT103 Transfer Form Handler
 * Optimized for performance, accessibility, and user experience
 */

class MT103FormHandler {
  constructor() {
    this.form = null;
    this.submitButton = null;
    this.resultDiv = null;
    this.isSubmitting = false;
    
    // Validation patterns
    this.patterns = {
      iban: /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$/,
      swift: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
      amount: /^\d+(\.\d{1,2})?$/
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }
  
  init() {
    this.form = document.getElementById('mt103-form');
    this.submitButton = this.form?.querySelector('button[type="submit"]');
    this.resultDiv = document.getElementById('result');
    
    if (!this.form || !this.submitButton || !this.resultDiv) {
      console.error('Required form elements not found');
      return;
    }
    
    this.attachEventListeners();
    this.setupValidation();
  }
  
  attachEventListeners() {
    // Form submission
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    
    // Real-time validation
    const inputs = this.form.querySelectorAll('input');
    inputs.forEach(input => {
      input.addEventListener('blur', () => this.validateField(input));
      input.addEventListener('input', () => this.debounce(() => this.validateField(input), 300));
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter' && !this.isSubmitting) {
        e.preventDefault();
        this.form.requestSubmit();
      }
    });
  }
  
  setupValidation() {
    // Add pattern attributes and ARIA labels
    const ibanInputs = this.form.querySelectorAll('input[name$="_iban"]');
    const swiftInputs = this.form.querySelectorAll('input[name$="_swift"]');
    const amountInput = this.form.querySelector('input[name="amount"]');
    
    ibanInputs.forEach(input => {
      input.setAttribute('pattern', this.patterns.iban.source);
      input.setAttribute('aria-describedby', `${input.name}-help`);
      this.addHelpText(input, 'IBAN format: Country code (2) + Check digits (2) + Bank code + Account number');
    });
    
    swiftInputs.forEach(input => {
      input.setAttribute('pattern', this.patterns.swift.source);
      input.setAttribute('aria-describedby', `${input.name}-help`);
      this.addHelpText(input, 'SWIFT format: Bank code (4) + Country code (2) + Location code (2) + Branch code (3, optional)');
    });
    
    if (amountInput) {
      amountInput.setAttribute('min', '0.01');
      amountInput.setAttribute('step', '0.01');
      amountInput.setAttribute('aria-describedby', `${amountInput.name}-help`);
      this.addHelpText(amountInput, 'Enter amount in EUR (e.g., 1000.50)');
    }
  }
  
  addHelpText(input, text) {
    const helpId = `${input.name}-help`;
    if (document.getElementById(helpId)) return;
    
    const helpDiv = document.createElement('div');
    helpDiv.id = helpId;
    helpDiv.className = 'help-text';
    helpDiv.textContent = text;
    helpDiv.style.cssText = `
      font-size: 12px;
      color: #666;
      margin-top: 2px;
      display: none;
    `;
    
    input.parentNode.insertBefore(helpDiv, input.nextSibling);
    
    // Show help on focus
    input.addEventListener('focus', () => helpDiv.style.display = 'block');
    input.addEventListener('blur', () => helpDiv.style.display = 'none');
  }
  
  validateField(input) {
    const value = input.value.trim();
    const fieldName = input.name;
    let isValid = true;
    let errorMessage = '';
    
    // Clear previous validation state
    input.classList.remove('error', 'valid');
    this.clearFieldError(input);
    
    if (!value && input.required) {
      isValid = false;
      errorMessage = 'This field is required';
    } else if (value) {
      switch (true) {
        case fieldName.includes('iban'):
          if (!this.patterns.iban.test(value.toUpperCase())) {
            isValid = false;
            errorMessage = 'Invalid IBAN format';
          }
          break;
          
        case fieldName.includes('swift'):
          if (!this.patterns.swift.test(value.toUpperCase())) {
            isValid = false;
            errorMessage = 'Invalid SWIFT code format';
          }
          break;
          
        case fieldName === 'amount':
          const amount = parseFloat(value);
          if (!this.patterns.amount.test(value) || amount <= 0) {
            isValid = false;
            errorMessage = 'Please enter a valid amount greater than 0';
          } else if (amount > 999999.99) {
            isValid = false;
            errorMessage = 'Amount cannot exceed 999,999.99 EUR';
          }
          break;
          
        case fieldName.includes('account'):
          if (value.length < 4) {
            isValid = false;
            errorMessage = 'Account number must be at least 4 characters';
          }
          break;
      }
    }
    
    if (isValid) {
      input.classList.add('valid');
    } else {
      input.classList.add('error');
      this.showFieldError(input, errorMessage);
    }
    
    return isValid;
  }
  
  showFieldError(input, message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
      color: #dc3545;
      font-size: 12px;
      margin-top: 2px;
    `;
    
    input.parentNode.insertBefore(errorDiv, input.nextSibling);
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', errorDiv.id = `error-${input.name}`);
  }
  
  clearFieldError(input) {
    const errorDiv = input.parentNode.querySelector('.field-error');
    if (errorDiv) {
      errorDiv.remove();
    }
    input.removeAttribute('aria-invalid');
  }
  
  validateForm() {
    const inputs = this.form.querySelectorAll('input[required]');
    let isValid = true;
    
    inputs.forEach(input => {
      if (!this.validateField(input)) {
        isValid = false;
      }
    });
    
    return isValid;
  }
  
  async handleSubmit(e) {
    e.preventDefault();
    
    if (this.isSubmitting) return;
    
    if (!this.validateForm()) {
      this.showResult('Please fix the validation errors before submitting.', 'error');
      return;
    }
    
    this.setLoadingState(true);
    
    try {
      const formData = new FormData(this.form);
      const payload = this.buildPayload(formData);
      
      const response = await this.submitTransfer(payload);
      const data = await response.json();
      
      if (response.ok) {
        this.showResult(JSON.stringify(data, null, 2), 'success');
        this.trackEvent('mt103_transfer_success');
      } else {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
    } catch (error) {
      console.error('Transfer submission failed:', error);
      this.showResult(`Error: ${error.message}`, 'error');
      this.trackEvent('mt103_transfer_error', { error: error.message });
    } finally {
      this.setLoadingState(false);
    }
  }
  
  buildPayload(formData) {
    return {
      protocol: "101.1",
      server: "SBI-3.10.0693.5.2-e19",
      currency: "EUR",
      amount: parseFloat(formData.get('amount')),
      sender: {
        Name: formData.get('sender_name'),
        Account: formData.get('sender_account'),
        IBAN: formData.get('sender_iban').toUpperCase(),
        Bank: formData.get('sender_bank'),
        SWIFT: formData.get('sender_swift').toUpperCase()
      },
      receiver: {
        Name: formData.get('receiver_name'),
        IBAN: formData.get('receiver_iban').toUpperCase(),
        Bank: formData.get('receiver_bank'),
        SWIFT: formData.get('receiver_swift').toUpperCase()
      }
    };
  }
  
  async submitTransfer(payload) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
    
    try {
      return await fetch('/api/send_mt103', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }
  
  setLoadingState(isLoading) {
    this.isSubmitting = isLoading;
    this.submitButton.disabled = isLoading;
    
    if (isLoading) {
      this.submitButton.classList.add('loading');
      this.submitButton.setAttribute('aria-label', 'Submitting transfer...');
    } else {
      this.submitButton.classList.remove('loading');
      this.submitButton.setAttribute('aria-label', 'Send Transfer');
    }
  }
  
  showResult(message, type = 'info') {
    this.resultDiv.textContent = message;
    this.resultDiv.className = `result ${type}`;
    this.resultDiv.setAttribute('role', type === 'error' ? 'alert' : 'status');
    
    // Scroll to result
    this.resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Clear after 10 seconds for non-error messages
    if (type !== 'error') {
      setTimeout(() => {
        this.resultDiv.textContent = '';
        this.resultDiv.className = 'result';
      }, 10000);
    }
  }
  
  // Utility function for debouncing
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  // Simple analytics/tracking
  trackEvent(eventName, data = {}) {
    if (window.gtag) {
      window.gtag('event', eventName, data);
    } else if (window.analytics) {
      window.analytics.track(eventName, data);
    } else {
      console.log('Event tracked:', eventName, data);
    }
  }
}

// Initialize the form handler
new MT103FormHandler();