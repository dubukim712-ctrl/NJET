export type DatabasePhoneVerificationFunctions = {
  create_phone_verification_challenge: {
    Args: {
      p_user_id: string;
      p_challenge_id: string;
      p_phone_number: string;
      p_code_hash: string;
    };
    Returns: boolean;
  };
  invalidate_phone_verification_challenge: {
    Args: { p_user_id: string; p_challenge_id: string };
    Returns: undefined;
  };
  verify_phone_verification_challenge: {
    Args: {
      p_user_id: string;
      p_challenge_id: string;
      p_code_hash: string;
    };
    Returns: {
      verification_status: string;
      verified_phone_number: string | null;
    }[];
  };
  mark_order_phone_manually_verified: {
    Args: { p_order_id: string };
    Returns: undefined;
  };
};
