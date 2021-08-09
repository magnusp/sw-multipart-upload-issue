require('dotenv').config();
const fs = require("fs");
const {CompleteMultipartUploadCommand} = require("@aws-sdk/client-s3");
const {UploadPartCommand} = require("@aws-sdk/client-s3");
const {CreateMultipartUploadCommand} = require("@aws-sdk/client-s3");
const {S3Client} = require("@aws-sdk/client-s3");

const useSSL = (process.env.MINIO_USE_SSL ?? 'false') === 'true'
const config = {
    region: process.env.MINIO_REGION ?? 'us-east-1',
    endpoint: {
        protocol: useSSL ? 'https' : 'http',
        hostname: process.env.MINIO_HOST ?? 'localhost',
        port: parseInt(process.env.MINIO_PORT ?? '9000', 10),
        path: '/',
    },
    forcePathStyle: true,
    credentials: { accessKeyId: process.env.MINIO_ACCESSKEY, secretAccessKey: process.env.MINIO_SECRETKEY },
    logger: console
};

(async () => {
    const s3Client = new S3Client(config);

    const { UploadId } = await s3Client.send(
        new CreateMultipartUploadCommand({
            Bucket: "mybucket",
            Key: "mykey"
        })
    );

    const promises = [];
    promises.push(new Promise(async (resolve) => {
        let fileReadableStream = fs.createReadStream('./part.1');
        let uploadPartCommandInput = {
            UploadId: UploadId,
            Key: "mykey",
            Body: fileReadableStream,
            PartNumber: 1,
            Bucket: 'mybucket',
        };
        let data = await s3Client.send(new UploadPartCommand(uploadPartCommandInput));
        resolve({
            ETag: data.ETag,
            PartNumber: 1
        });
    }));

    promises.push(new Promise(async (resolve) => {
        let fileReadableStream = fs.createReadStream('./part.2');
        let uploadPartCommandInput = {
            UploadId: UploadId,
            Key: "mykey",
            Body: fileReadableStream,
            PartNumber: 2,
            Bucket: 'mybucket',
        };
        let data = await s3Client.send(new UploadPartCommand(uploadPartCommandInput));
        resolve({
            ETag: data.ETag,
            PartNumber: 2
        });
    }));

    const parts = await Promise.all(promises);
    console.log(parts);

    const completeMultiPartUploadCommandInput = {
        Bucket: "mybucket",
        Key: "mykey",
        UploadId: UploadId,
        MultipartUpload: {
            Parts: parts
        }
    };
    try {
        await s3Client.send(
            new CompleteMultipartUploadCommand(completeMultiPartUploadCommandInput)
        );
    } catch (e) {
        throw e;
    }
})();

