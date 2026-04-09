import { useState } from 'react';
import './RegisterForm.css';

const emptyForm = {
  fullName: '',
  email: '',
  monthlyIncome: '',
};

function RegisterForm({ onRegister }) {
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.fullName.trim()) {
      nextErrors.fullName = 'Full name is required.';
    }

    if (!formData.email.includes('@')) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.monthlyIncome || Number(formData.monthlyIncome) <= 0) {
      nextErrors.monthlyIncome = 'Monthly income must be greater than 0.';
    }

    return nextErrors;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const nextErrors = validateForm();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setSuccessMessage('');
      return;
    }

    onRegister({
      ...formData,
      monthlyIncome: Number(formData.monthlyIncome).toLocaleString(),
    });

    setSuccessMessage('Profile saved. The dashboard updated instantly.');
    setFormData(emptyForm);
  };

  return (
    <form className="register-form" onSubmit={handleSubmit}>
      <h2>Register Your Dashboard</h2>
      <p>
        This form is fully controlled with React state, so every input updates
        the UI as you type.
      </p>

      <label htmlFor="fullName">
        Full Name
        <input
          id="fullName"
          name="fullName"
          type="text"
          value={formData.fullName}
          onChange={handleChange}
          placeholder="Regan Amanor"
        />
      </label>
      {errors.fullName ? <p className="error-text">{errors.fullName}</p> : null}

      <label htmlFor="email">
        Email
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="regan@example.com"
        />
      </label>
      {errors.email ? <p className="error-text">{errors.email}</p> : null}

      <label htmlFor="monthlyIncome">
        Monthly Income
        <input
          id="monthlyIncome"
          name="monthlyIncome"
          type="number"
          value={formData.monthlyIncome}
          onChange={handleChange}
          placeholder="3000"
        />
      </label>
      {errors.monthlyIncome ? (
        <p className="error-text">{errors.monthlyIncome}</p>
      ) : null}

      <button type="submit">Save Profile</button>
      {successMessage ? <p className="success-text">{successMessage}</p> : null}
    </form>
  );
}

export default RegisterForm;
