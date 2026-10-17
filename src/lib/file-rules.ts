export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = 11 * 1024 * 1024;
export const FILE_EXPIRES = [5, 30, 60, 1440, 10080];
export const FILE_DOWNLOAD_LIMITS = [1, 3, 5, 10];
export const FILE_EXTENSIONS = ['txt', 'md', 'csv', 'json', 'log', 'yaml', 'yml', 'xml', 'html', 'css', 'js', 'jsx', 'ts', 'tsx', 'py', 'sh', 'sql', 'go', 'java', 'rs', 'c', 'h', 'cpp', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'zip'];
export const FILE_ACCEPT = FILE_EXTENSIONS.map((extension) => `.${extension}`).join(',');
