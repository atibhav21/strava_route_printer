
export const blobUrlToBase64 = (blobUrl: string): Promise<string> =>
    fetch(blobUrl)
        .then((r) => r.blob())
        .then(
            (blob) =>
                new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                })
        );