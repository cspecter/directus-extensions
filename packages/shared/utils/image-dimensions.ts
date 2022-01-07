export const imageDimensions = (data: Blob, cb: (img: HTMLImageElement) => Promise<void>) => {
    const img = new Image();

    img.src = URL.createObjectURL(data);
    img.onload = function () {
        cb(img)
    };
}

export default imageDimensions