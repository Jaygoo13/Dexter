package com.samsung.sec.dexter.vdcpp.util;

import java.util.HashMap;
import java.util.Map;
import org.eclipse.cdt.core.dom.ast.IASTTranslationUnit;
import org.eclipse.cdt.core.dom.parser.IScannerExtensionConfiguration;
import org.eclipse.cdt.core.dom.parser.c.ANSICParserExtensionConfiguration;
import org.eclipse.cdt.core.dom.parser.c.GCCScannerExtensionConfiguration;
import org.eclipse.cdt.core.dom.parser.c.ICParserExtensionConfiguration;
import org.eclipse.cdt.core.dom.parser.cpp.ANSICPPParserExtensionConfiguration;
import org.eclipse.cdt.core.dom.parser.cpp.GPPScannerExtensionConfiguration;
import org.eclipse.cdt.core.dom.parser.cpp.ICPPParserExtensionConfiguration;
import org.eclipse.cdt.core.parser.FileContent;
import org.eclipse.cdt.core.parser.IScanner;
import org.eclipse.cdt.core.parser.IScannerInfo;
import org.eclipse.cdt.core.parser.IncludeFileContentProvider;
import org.eclipse.cdt.core.parser.NullLogService;
import org.eclipse.cdt.core.parser.ParserLanguage;
import org.eclipse.cdt.core.parser.ParserMode;
import org.eclipse.cdt.core.parser.ScannerInfo;
import org.eclipse.cdt.internal.core.dom.parser.AbstractGNUSourceCodeParser;
import org.eclipse.cdt.internal.core.dom.parser.c.GNUCSourceParser;
import org.eclipse.cdt.internal.core.dom.parser.cpp.GNUCPPSourceParser;
import org.eclipse.cdt.internal.core.parser.scanner.CPreprocessor;
import com.samsung.sec.dexter.core.analyzer.AnalysisConfig;
import com.samsung.sec.dexter.core.config.DexterConfig;
import com.samsung.sec.dexter.core.config.DexterConfig.LANGUAGE;
import com.samsung.sec.dexter.core.exception.DexterRuntimeException;

public class TranslationUnitFactory implements ITranslationUnitFactory {
	@Override
	public IASTTranslationUnit getASTTranslationUnit(AnalysisConfig config) {
		final String code = config.getSourcecodeThatReadIfNotExist();
			
		return getTranslationUnit(code, 
				toCdtParserLanguage(config.getLanguageEnum(), config.getSourceFileFullPath()), 
				config.getSourceFileFullPath());
	}
	
	private IASTTranslationUnit getTranslationUnit(final String code, final ParserLanguage lang, 
			final String filePath){
		IScanner scanner = createScanner(code, filePath);
		AbstractGNUSourceCodeParser parser = createParser(lang, scanner);
		parser.setMaximumTrivialExpressionsInAggregateInitializers(Integer.MAX_VALUE);		
		return parser.parse();			
	}

	private IScanner createScanner(final String code, final String filePath) {
		
	    FileContent codeReader = FileContent.create(filePath, code.toCharArray());
		Map<String, String> map = createScannerMap();	
		String[] includePath ={};
		IScannerInfo scannerInfo = new ScannerInfo(map,includePath);		
		return createScanner(codeReader, ParserLanguage.CPP, ParserMode.COMPLETE_PARSE, scannerInfo);
    }

	private Map<String, String> createScannerMap() {
	    Map<String, String> map = new HashMap<String, String>();
	   
		map.put("__SIZEOF_SHORT__", "2");
		map.put("__SIZEOF_INT__", "4");
		map.put("__SIZEOF_LONG__", "8");
		map.put("__SIZEOF_POINTER", "8");
		
	    return map;
    }
	
	private IScanner createScanner(FileContent codeReader, ParserLanguage lang, ParserMode mode, 
			IScannerInfo scannerInfo){
		IScannerExtensionConfiguration configuration = null;
		
		if(lang == ParserLanguage.C){
			configuration = GCCScannerExtensionConfiguration.getInstance(scannerInfo);
		} else {
			configuration = GPPScannerExtensionConfiguration.getInstance(scannerInfo);
		}		
				
		return new CPreprocessor(codeReader, scannerInfo, lang, new NullLogService(), configuration,
				IncludeFileContentProvider.getEmptyFilesProvider());
	}
	
	
	private AbstractGNUSourceCodeParser createParser(final ParserLanguage lang, IScanner scanner) {
	    AbstractGNUSourceCodeParser parser = null;		
		if(lang == ParserLanguage.CPP){
			ICPPParserExtensionConfiguration parserConfig =  null;
			parserConfig = new ANSICPPParserExtensionConfiguration();
			parser = new GNUCPPSourceParser(scanner, ParserMode.COMPLETE_PARSE, new NullLogService(), parserConfig, null);
		} else {
			ICParserExtensionConfiguration parserConfig = null;	// GNU or ANSI
			parserConfig = new ANSICParserExtensionConfiguration();
			parser = new GNUCSourceParser(scanner, ParserMode.COMPLETE_PARSE, new NullLogService(), parserConfig, null);
		}
		
	    return parser;
    }
	
	private ParserLanguage toCdtParserLanguage(final LANGUAGE language, final String sourceFileFullPath) {
	    if(language == DexterConfig.LANGUAGE.C){
	    	return ParserLanguage.C;
	    } else if(language == DexterConfig.LANGUAGE.CPP){
	    	return ParserLanguage.CPP;
	    } else {
	    	throw new DexterRuntimeException("File is not supporing to analyze : " + sourceFileFullPath);
	    }
    }
}
