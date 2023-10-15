package logstore

const ChunkSize = 10 * 1024 * 1024

func getChunkIndex(off int64) int {
	return int(off / ChunkSize)
}

func getChunksSize(chunks []*LogChunk) (n int64) {
	l := len(chunks)
	if l == 0 {
		return 0
	}
	return int64(chunks[l-1].Len + ChunkSize*(l-1))
}
