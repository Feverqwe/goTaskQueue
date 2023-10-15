package logstore

const ChunkSize = 10 * 1024 * 1024

func getChunkIndex(off int64, cSize int) int {
	return int(off / int64(cSize))
}

func getChunksSize(chunks []*LogChunk, cSize int) (n int64) {
	l := len(chunks)
	if l == 0 {
		return 0
	}
	return int64(chunks[l-1].Len + cSize*(l-1))
}

func getAvailableSize(chunk *LogChunk, cSize int) int {
	return cSize - chunk.Len
}
