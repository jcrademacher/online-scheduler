import { PreSignUpTriggerEvent } from 'aws-lambda';

export const handler = async (event: PreSignUpTriggerEvent) => {
  const allowedEmails = process.env.ALLOWED_EMAILS?.split(',') || [];
  const userEmail = event.request.userAttributes.email;

  if (!allowedEmails.includes(userEmail)) {
    throw new Error('Signup is not allowed. Please contact administrator.');
  }

  return event;
};
