import fs from "fs";
import mongoose from "mongoose";
import path from "path";
import Movie from "../models/movieModel.js";

const API_BASE = "http://localhost:4000";

const createHttpError = (status, message) => {
	const err = new Error(message);
	err.status = status;
	return err;
};

const getUploadUrl = (val) => {
	if (!val) return null;
	if (typeof val === "string" && /^(https?:\/\/)/.test(val)) return val;
	const cleaned = String(val).replace(/^uploads\//, "");
	if (!cleaned) return null;
	return `${API_BASE}/uploads/${cleaned}`;
};

const extractFilenameFromUrl = (u) => {
	if (!u || typeof u !== "string") return null;
	const parts = u.split("/uploads/");
	if (parts[1]) return parts[1];
	if (u.startsWith("uploads/")) return u.replace(/^uploads\//, "");
	return /^[^\/]+\.[a-zA-Z0-9]+$/.test(u) ? u : null;
};

const tryUnlinkUploadUrl = (urlOrFilename) => {
	const fn = extractFilenameFromUrl(urlOrFilename);
	if (!fn) return;
	const filepath = path.join(process.cwd(), "uploads", fn);
	fs.unlink(filepath, (err) => {
		if (err) console.warn("Failed to unlink file", filepath, err?.message || err);
	});
};

const safeParseJSON = (v) => {
	if (!v) return null;
	if (typeof v === "object") return v;
	try {
		return JSON.parse(v);
	} catch {
		return null;
	}
};

const normalizeLatestPersonFilename = (value) => {
	if (!value) return null;
	if (typeof value === "string") {
		const fn = extractFilenameFromUrl(value);
		return fn || value;
	}
	if (typeof value === "object") {
		const candidate =
			value.filename || value.path || value.url || value.file || value.image || value.preview || null;
		return candidate ? normalizeLatestPersonFilename(candidate) : null;
	}
	return null;
};

const personToPreview = (p) => {
	if (!p) return { name: "", role: "", preview: null };
	const candidate = p.preview || p.file || p.image || p.url || null;
	return {
		name: p.name || "",
		role: p.role || "",
		preview: candidate ? getUploadUrl(candidate) : null,
	};
};

const buildLatestTrailerPeople = (arr = []) =>
	(arr || []).map((p) => ({
		name: (p && p.name) || "",
		role: (p && p.role) || "",
		file: normalizeLatestPersonFilename(p && (p.file || p.preview || p.url || p.image)),
	}));

const enrichLatestTrailerForOutput = (lt = {}) => {
	const copy = { ...lt };
	copy.thumbnail = copy.thumbnail ? getUploadUrl(copy.thumbnail) : copy.thumbnail || null;
	const mapPerson = (p) => {
		const c = { ...(p || {}) };
		c.preview = c.file ? getUploadUrl(c.file) : c.preview ? getUploadUrl(c.preview) : null;
		c.name = c.name || "";
		c.role = c.role || "";
		return c;
	};
	copy.directors = (copy.directors || []).map(mapPerson);
	copy.producers = (copy.producers || []).map(mapPerson);
	copy.singers = (copy.singers || []).map(mapPerson);
	return copy;
};

const normalizeItemForOutput = (it = {}) => {
	const obj = { ...it };
	obj.thumbnail = it.latestTrailer?.thumbnail
		? getUploadUrl(it.latestTrailer.thumbnail)
		: it.poster
			? getUploadUrl(it.poster)
			: null;
	obj.trailerUrl = it.trailerUrl || it.latestTrailer?.url || it.latestTrailer?.videoId || null;

	if (it.type === "latestTrailers" && it.latestTrailer) {
		const lt = it.latestTrailer;
		obj.genres = obj.genres || lt.genres || [];
		obj.year = obj.year || lt.year || null;
		obj.rating = obj.rating || lt.rating || null;
		obj.duration = obj.duration || lt.duration || null;
		obj.description = obj.description || lt.description || lt.excerpt || "";
	}

	obj.cast = (it.cast || []).map(personToPreview);
	obj.directors = (it.directors || []).map(personToPreview);
	obj.producers = (it.producers || []).map(personToPreview);

	if (it.latestTrailer) obj.latestTrailer = enrichLatestTrailerForOutput(it.latestTrailer);

	obj.auditorium = it.auditorium || null;

	return obj;
};

export async function createMovieService({ body = {}, files = {} }) {
	const posterUrl = files?.poster?.[0]?.filename ? getUploadUrl(files.poster[0].filename) : body.poster || null;
	const trailerUrl = files?.trailerUrl?.[0]?.filename
		? getUploadUrl(files.trailerUrl[0].filename)
		: body.trailerUrl || null;
	const videoUrl = files?.videoUrl?.[0]?.filename ? getUploadUrl(files.videoUrl[0].filename) : body.videoUrl || null;

	const categories =
		safeParseJSON(body.categories) ||
		(body.categories ? String(body.categories).split(",").map((s) => s.trim()).filter(Boolean) : []);
	const slots = safeParseJSON(body.slots) || [];
	const seatPrices = safeParseJSON(body.seatPrices) || {
		standard: Number(body.standard || 0),
		recliner: Number(body.recliner || 0),
	};

	const cast = safeParseJSON(body.cast) || [];
	const directors = safeParseJSON(body.directors) || [];
	const producers = safeParseJSON(body.producers) || [];

	const attachFiles = (filesArrName, targetArr, toFilename = (f) => getUploadUrl(f)) => {
		if (!files?.[filesArrName]) return;
		files[filesArrName].forEach((file, idx) => {
			if (targetArr[idx]) targetArr[idx].file = toFilename(file.filename);
			else targetArr[idx] = { name: "", file: toFilename(file.filename) };
		});
	};
	attachFiles("castFiles", cast);
	attachFiles("directorFiles", directors);
	attachFiles("producerFiles", producers);

	const latestTrailerBody = safeParseJSON(body.latestTrailer) || {};
	if (files?.ltThumbnail?.[0]?.filename) latestTrailerBody.thumbnail = files.ltThumbnail[0].filename;
	else if (body.ltThumbnail) {
		const fn = extractFilenameFromUrl(body.ltThumbnail);
		latestTrailerBody.thumbnail = fn || body.ltThumbnail;
	}
	if (body.ltVideoUrl) latestTrailerBody.videoId = body.ltVideoUrl;
	if (body.ltUrl) latestTrailerBody.url = body.ltUrl;
	if (body.ltTitle) latestTrailerBody.title = body.ltTitle;

	latestTrailerBody.directors = latestTrailerBody.directors || [];
	latestTrailerBody.producers = latestTrailerBody.producers || [];
	latestTrailerBody.singers = latestTrailerBody.singers || [];

	const attachLtFiles = (fieldName, arrName) => {
		if (!files?.[fieldName]) return;
		files[fieldName].forEach((file, idx) => {
			const filename = file.filename;
			if (latestTrailerBody[arrName][idx]) latestTrailerBody[arrName][idx].file = filename;
			else latestTrailerBody[arrName][idx] = { name: "", file: filename };
		});
	};
	attachLtFiles("ltDirectorFiles", "directors");
	attachLtFiles("ltProducerFiles", "producers");
	attachLtFiles("ltSingerFiles", "singers");

	latestTrailerBody.directors = buildLatestTrailerPeople(latestTrailerBody.directors);
	latestTrailerBody.producers = buildLatestTrailerPeople(latestTrailerBody.producers);
	latestTrailerBody.singers = buildLatestTrailerPeople(latestTrailerBody.singers);

	const auditoriumValue =
		typeof body.auditorium === "string" && body.auditorium.trim() ? String(body.auditorium).trim() : "Audi 1";

	const doc = new Movie({
		_id: new mongoose.Types.ObjectId(),
		type: body.type || "normal",
		movieName: body.movieName || body.title || "",
		categories,
		poster: posterUrl,
		trailerUrl,
		videoUrl,
		rating: Number(body.rating) || 0,
		duration: Number(body.duration) || 0,
		slots,
		seatPrices,
		cast,
		directors,
		producers,
		story: body.story || "",
		latestTrailer: latestTrailerBody,
		auditorium: auditoriumValue,
	});

	return doc.save();
}

export async function getMoviesService(query = {}) {
	const { category, type, sort = "-createdAt", page = 1, limit = 12, search, latestTrailers } = query;

	let filter = {};
	if (typeof category === "string" && category.trim()) filter.categories = { $in: [category.trim()] };
	if (typeof type === "string" && type.trim()) filter.type = type.trim();
	if (typeof search === "string" && search.trim()) {
		const q = search.trim();
		filter.$or = [
			{ movieName: { $regex: q, $options: "i" } },
			{ "latestTrailer.title": { $regex: q, $options: "i" } },
			{ story: { $regex: q, $options: "i" } },
		];
	}
	if (latestTrailers && String(latestTrailers).toLowerCase() !== "false") {
		filter = Object.keys(filter).length === 0 ? { type: "latestTrailers" } : { $and: [filter, { type: "latestTrailers" }] };
	}

	const pg = Math.max(1, parseInt(page, 10) || 1);
	const lim = Math.min(200, parseInt(limit, 10) || 12);
	const skip = (pg - 1) * lim;

	const total = await Movie.countDocuments(filter);
	const items = await Movie.find(filter).sort(sort).skip(skip).limit(lim).lean();
	const normalized = (items || []).map(normalizeItemForOutput);

	return { total, page: pg, limit: lim, items: normalized };
}

export async function getMovieByIdService(id) {
	if (!id) throw createHttpError(400, "id is required");

	const item = await Movie.findById(id).lean();
	if (!item) throw createHttpError(404, "Movie not found");

	const obj = normalizeItemForOutput(item);
	if (item.type === "latestTrailers" && item.latestTrailer) {
		const lt = item.latestTrailer;
		obj.genres = obj.genres || lt.genres || [];
		obj.year = obj.year || lt.year || null;
		obj.rating = obj.rating || lt.rating || null;
		obj.duration = obj.duration || lt.duration || null;
		obj.description = obj.description || lt.description || lt.excerpt || obj.description || "";
	}

	return obj;
}

export async function deleteMovieService(id) {
	if (!id) throw createHttpError(400, "id is required");

	const m = await Movie.findById(id);
	if (!m) throw createHttpError(404, "Movie not found");

	if (m.poster) tryUnlinkUploadUrl(m.poster);
	if (m.latestTrailer && m.latestTrailer.thumbnail) tryUnlinkUploadUrl(m.latestTrailer.thumbnail);

	[m.cast || [], m.directors || [], m.producers || []].forEach((arr) =>
		arr.forEach((p) => {
			if (p && p.file) tryUnlinkUploadUrl(p.file);
		})
	);

	if (m.latestTrailer) {
		[...(m.latestTrailer.directors || []), ...(m.latestTrailer.producers || []), ...(m.latestTrailer.singers || [])].forEach(
			(p) => {
				if (p && p.file) tryUnlinkUploadUrl(p.file);
			}
		);
	}

	await Movie.findByIdAndDelete(id);
}

export default {
	createMovieService,
	getMoviesService,
	getMovieByIdService,
	deleteMovieService,
};
