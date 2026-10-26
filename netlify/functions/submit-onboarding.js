const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const isUS = formData.country === 'United States';

    // Basic validation
    if (!formData.companyName || !formData.address || !formData.zipCity || !formData.country || 
        !formData.phone || !formData.email || !formData.signatoryName || !signaturePreview) {
        setErrorMessage("Please complete all required fields and provide a signature.");
        setIsSubmitting(false);
        return;
    }

    if (!gdprConsent) {
        setErrorMessage("You must agree to the GDPR data consent to submit.");
        setIsSubmitting(false);
        return;
    }

    try {
        const response = await fetch('/.netlify/functions/submit-onboarding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                formData,
                signatureBase64: signaturePreview
            })
        });

        const result = await response.json();

        if (response.ok) {
            setSuccessMessage("Onboarding form submitted successfully! A copy has been delivered to Finance.");
        } else {
            setErrorMessage(`Submission error: ${result.error || 'Server error'}`);
        }
    } catch (err) {
        setErrorMessage("Network error: Could not reach the server function.");
    } finally {
        setIsSubmitting(false);
    }
};
