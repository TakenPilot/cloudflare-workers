export const isUniqueConstraintError = (error: Error): boolean => {
	return /^D1_ERROR: UNIQUE constraint failed: (.*)+$/.test(error.message);
};
