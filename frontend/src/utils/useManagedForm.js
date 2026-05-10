import { useCallback, useState } from 'react';

export const hasFormErrors = (errors) => Object.keys(errors).length > 0;

function resolveInitialValues(defaultValues) {
  return { ...defaultValues };
}

export function useManagedForm({ defaultValues, validate = () => ({}) }) {
  const [values, setRenderedValues] = useState(() => resolveInitialValues(defaultValues));
  const [errors, setErrors] = useState({});

  const setValues = useCallback((nextValues) => {
    setRenderedValues((currentValues) => {
      const resolvedValues =
        typeof nextValues === 'function' ? nextValues(currentValues) : nextValues;
      return resolveInitialValues(resolvedValues);
    });
  }, []);

  const setFieldValue = useCallback((name, value) => {
    setValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));
    setErrors((currentErrors) => {
      if (!currentErrors[name]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[name];
      return nextErrors;
    });
  }, [setValues]);

  const register = useCallback((name) => {
    const value = values[name];

    if (typeof value === 'boolean') {
      return {
        checked: Boolean(value),
        name,
        onChange: (event) => setFieldValue(name, event.target.checked),
      };
    }

    return {
      name,
      onChange: (event) => setFieldValue(name, event.target.value),
      value: value ?? '',
    };
  }, [setFieldValue, values]);

  const reset = useCallback((nextValues) => {
    setValues(resolveInitialValues(nextValues));
    setErrors({});
  }, [setValues]);

  const handleSubmit = useCallback((onValid) => async (event) => {
    event?.preventDefault();

    const nextErrors = validate(values);
    setErrors(nextErrors);

    if (hasFormErrors(nextErrors)) {
      return;
    }

    await onValid(values);
  }, [validate, values]);

  return {
    errors,
    handleSubmit,
    register,
    reset,
    setFieldValue,
    setValues,
    values,
  };
}
